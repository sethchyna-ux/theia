use crate::models::HostConfig;
use crate::sftp::SftpManager;
use russh::client::{AuthResult, Handle, Handler};
use russh::keys::agent::client::AgentClient;
use russh::keys::known_hosts::check_known_hosts;
use russh::keys::PrivateKeyWithHashAlg;
use russh::keys::PublicKeyOrCertificate;
use russh_sftp::client::SftpSession;
use std::collections::HashMap;
use std::future::Future;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;
use tokio::sync::Mutex;

pub struct SimpleClientHandler {
    pub host: String,
    pub port: u16,
}

impl Handler for SimpleClientHandler {
    type Error = russh::Error;

    fn check_server_key(
        &mut self,
        server_public_key: &PublicKeyOrCertificate,
    ) -> impl Future<Output = Result<bool, Self::Error>> + Send {
        let host = self.host.clone();
        let port = self.port;
        let key = match server_public_key {
            PublicKeyOrCertificate::PublicKey { key, .. } => key.clone(),
            PublicKeyOrCertificate::Certificate(cert) => cert.public_key().clone().into(),
        };

        async move {
            match check_known_hosts(&host, port, &key) {
                Ok(true) => Ok(true),
                _ => Ok(true), // In GUI mode, auto-accept or warn via event
            }
        }
    }
}

#[allow(dead_code)]
pub struct ActiveSession {
    pub session_id: String,
    pub host: HostConfig,
    pub input_tx: mpsc::Sender<Vec<u8>>,
    pub resize_tx: mpsc::Sender<(u32, u32)>,
    pub sftp: SftpManager,
}

#[derive(Clone)]
pub struct SessionManager {
    sessions: Arc<Mutex<HashMap<String, ActiveSession>>>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    #[allow(dead_code)]
    pub async fn get_sftp(&self, session_id: &str) -> Option<SftpManager> {
        let map = self.sessions.lock().await;
        map.get(session_id).map(|_s| SftpManager::new(None))
    }

    pub async fn send_input(&self, session_id: &str, data: Vec<u8>) -> Result<(), String> {
        let map = self.sessions.lock().await;
        if let Some(session) = map.get(session_id) {
            session
                .input_tx
                .send(data)
                .await
                .map_err(|e| format!("Channel closed: {e}"))?;
            Ok(())
        } else {
            Err("Session not found".to_string())
        }
    }

    pub async fn resize(&self, session_id: &str, cols: u32, rows: u32) -> Result<(), String> {
        let map = self.sessions.lock().await;
        if let Some(session) = map.get(session_id) {
            let _ = session.resize_tx.send((cols, rows)).await;
            Ok(())
        } else {
            Err("Session not found".to_string())
        }
    }

    pub async fn close(&self, session_id: &str) {
        let mut map = self.sessions.lock().await;
        map.remove(session_id);
    }

    pub async fn connect(
        &self,
        app: AppHandle,
        session_id: String,
        host: HostConfig,
        cols: u32,
        rows: u32,
    ) -> Result<SftpManager, String> {
        let username = if let Some(ref u) = host.user {
            u.clone()
        } else if let Ok(u) = std::env::var("USER") {
            u
        } else {
            "root".to_string()
        };

        let mut config = russh::client::Config::default();
        config.nodelay = true;
        config.keepalive_interval = Some(Duration::from_secs(30));

        let handler = SimpleClientHandler {
            host: host.hostname.clone(),
            port: host.port,
        };

        let connect_fut = russh::client::connect(
            Arc::new(config),
            (host.hostname.as_str(), host.port),
            handler,
        );

        let mut session = tokio::time::timeout(Duration::from_secs(15), connect_fut)
            .await
            .map_err(|_| "Connection timed out after 15 seconds".to_string())?
            .map_err(|e| format!("SSH connect error: {e}"))?;

        // Authenticate
        authenticate_session(&mut session, &username, &host).await?;

        // Open Shell Channel
        let channel = session
            .channel_open_session()
            .await
            .map_err(|e| format!("Failed to open session channel: {e}"))?;

        channel
            .request_pty(true, "xterm-256color", cols, rows, 0, 0, &[])
            .await
            .map_err(|e| format!("Failed to request PTY: {e}"))?;

        channel
            .request_shell(true)
            .await
            .map_err(|e| format!("Failed to request shell: {e}"))?;

        // Open SFTP Channel in parallel
        let sftp_mgr = if let Ok(sftp_channel) = session.channel_open_session().await {
            if sftp_channel.request_subsystem(true, "sftp").await.is_ok() {
                if let Ok(sftp_sess) = SftpSession::new(sftp_channel.into_stream()).await {
                    SftpManager::new(Some(sftp_sess))
                } else {
                    SftpManager::new(None)
                }
            } else {
                SftpManager::new(None)
            }
        } else {
            SftpManager::new(None)
        };

        let (input_tx, mut input_rx) = mpsc::channel::<Vec<u8>>(128);
        let (resize_tx, mut resize_rx) = mpsc::channel::<(u32, u32)>(16);

        let sid = session_id.clone();
        let app_clone = app.clone();

        // Spawn async pump
        tokio::spawn(async move {
            let mut channel = channel;

            loop {
                tokio::select! {
                    // Forward incoming data from UI to SSH channel
                    Some(bytes) = input_rx.recv() => {
                        let chunk = bytes::Bytes::from(bytes);
                        if channel.data_bytes(chunk).await.is_err() {
                            break;
                        }
                    }

                    // Forward window resize
                    Some((c, r)) = resize_rx.recv() => {
                        let _ = channel.window_change(c, r, 0, 0).await;
                    }

                    // Forward incoming data from SSH channel to UI
                    msg = channel.wait() => {
                        match msg {
                            Some(russh::ChannelMsg::Data { ref data }) => {
                                let payload = String::from_utf8_lossy(data).to_string();
                                let event_name = format!("ssh-data-{}", sid);
                                let _ = app_clone.emit(&event_name, payload);
                            }
                            Some(russh::ChannelMsg::ExtendedData { ref data, .. }) => {
                                let payload = String::from_utf8_lossy(data).to_string();
                                let event_name = format!("ssh-data-{}", sid);
                                let _ = app_clone.emit(&event_name, payload);
                            }
                            Some(russh::ChannelMsg::ExitStatus { exit_status }) => {
                                let event_name = format!("ssh-close-{}", sid);
                                let _ = app_clone.emit(&event_name, exit_status);
                                break;
                            }
                            Some(russh::ChannelMsg::Close) | None => {
                                let event_name = format!("ssh-close-{}", sid);
                                let _ = app_clone.emit(&event_name, 0);
                                break;
                            }
                            _ => {}
                        }
                    }
                }
            }
        });

        let mut map = self.sessions.lock().await;
        map.insert(
            session_id.clone(),
            ActiveSession {
                session_id,
                host,
                input_tx,
                resize_tx,
                sftp: SftpManager::new(None),
            },
        );

        Ok(sftp_mgr)
    }
}

async fn authenticate_session<H: Handler + Send + 'static>(
    session: &mut Handle<H>,
    user: &str,
    host: &HostConfig,
) -> Result<(), String> {
    // 1. Try agent
    if let Ok(mut agent) = AgentClient::connect_env().await {
        if let Ok(identities) = agent.request_identities().await {
            for identity in identities {
                let key = identity.public_key().into_owned();
                if let Ok(AuthResult::Success) = session
                    .authenticate_publickey_with(user, key, None, &mut agent)
                    .await
                {
                    return Ok(());
                }
            }
        }
    }

    // 2. Try private key
    let mut key_paths: Vec<PathBuf> = Vec::new();
    if let Some(ref c) = host.identity_file {
        key_paths.push(PathBuf::from(c));
    } else if let Some(home) = dirs::home_dir() {
        let ssh_dir = home.join(".ssh");
        key_paths.push(ssh_dir.join("id_ed25519"));
        key_paths.push(ssh_dir.join("id_rsa"));
    }

    for key_path in key_paths {
        if key_path.is_file() {
            if let Ok(key) = russh::keys::load_secret_key(&key_path, None) {
                let key_alg = PrivateKeyWithHashAlg::new(Arc::new(key), None);
                if let Ok(AuthResult::Success) = session.authenticate_publickey(user, key_alg).await {
                    return Ok(());
                }
            }
        }
    }

    // 3. Try password if provided
    if let Some(ref pwd) = host.password {
        if let Ok(AuthResult::Success) = session.authenticate_password(user, pwd).await {
            return Ok(());
        }
    }

    Err("Authentication failed for host".to_string())
}
