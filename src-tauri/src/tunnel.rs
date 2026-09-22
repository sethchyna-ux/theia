use crate::models::TunnelConfig;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::Mutex;

pub fn get_tunnels_path() -> Option<PathBuf> {
    dirs::config_dir().map(|c| c.join("theia-ssh").join("tunnels.json"))
}

pub fn load_tunnels() -> Vec<TunnelConfig> {
    let path = match get_tunnels_path() {
        Some(p) => p,
        None => return default_tunnels(),
    };

    if !path.is_file() {
        let def = default_tunnels();
        let _ = save_tunnels(&def);
        return def;
    }

    let content = match fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return default_tunnels(),
    };

    serde_json::from_str::<Vec<TunnelConfig>>(&content).unwrap_or_else(|_| default_tunnels())
}

pub fn save_tunnels(tunnels: &[TunnelConfig]) -> Result<(), String> {
    let path = get_tunnels_path().ok_or("Could not resolve tunnels config path")?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(tunnels).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

fn default_tunnels() -> Vec<TunnelConfig> {
    vec![
        TunnelConfig {
            id: "tun_pg".to_string(),
            host_id: "".to_string(),
            tunnel_type: "local".to_string(),
            local_port: 5433,
            remote_host: Some("127.0.0.1".to_string()),
            remote_port: Some(5432),
            enabled: false,
            status: "stopped".to_string(),
            bytes_transferred: 0,
        },
        TunnelConfig {
            id: "tun_redis".to_string(),
            host_id: "".to_string(),
            tunnel_type: "local".to_string(),
            local_port: 6380,
            remote_host: Some("127.0.0.1".to_string()),
            remote_port: Some(6379),
            enabled: false,
            status: "stopped".to_string(),
            bytes_transferred: 0,
        },
        TunnelConfig {
            id: "tun_socks".to_string(),
            host_id: "".to_string(),
            tunnel_type: "dynamic".to_string(),
            local_port: 1080,
            remote_host: None,
            remote_port: None,
            enabled: false,
            status: "stopped".to_string(),
            bytes_transferred: 0,
        },
    ]
}

pub struct ActiveTunnelHandle {
    pub is_running: Arc<AtomicBool>,
    pub bytes: Arc<AtomicU64>,
}

#[derive(Clone)]
pub struct TunnelManager {
    active_handles: Arc<Mutex<HashMap<String, ActiveTunnelHandle>>>,
}

impl TunnelManager {
    pub fn new() -> Self {
        Self {
            active_handles: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn is_running(&self, tunnel_id: &str) -> bool {
        let map = self.active_handles.lock().await;
        if let Some(handle) = map.get(tunnel_id) {
            handle.is_running.load(Ordering::SeqCst)
        } else {
            false
        }
    }

    pub async fn get_bytes(&self, tunnel_id: &str) -> u64 {
        let map = self.active_handles.lock().await;
        if let Some(handle) = map.get(tunnel_id) {
            handle.bytes.load(Ordering::SeqCst)
        } else {
            0
        }
    }

    pub async fn stop(&self, tunnel_id: &str) {
        let mut map = self.active_handles.lock().await;
        if let Some(handle) = map.remove(tunnel_id) {
            handle.is_running.store(false, Ordering::SeqCst);
        }
    }

    pub async fn start_mock_local(&self, tunnel: &TunnelConfig) -> Result<(), String> {
        let is_running = Arc::new(AtomicBool::new(true));
        let bytes = Arc::new(AtomicU64::new(0));

        let flag = is_running.clone();
        let b_counter = bytes.clone();
        let port = tunnel.local_port;

        let listener = TcpListener::bind(format!("127.0.0.1:{}", port))
            .await
            .map_err(|e| format!("Port {} is already in use: {}", port, e))?;

        tokio::spawn(async move {
            while flag.load(Ordering::SeqCst) {
                if let Ok((stream, _)) = listener.accept().await {
                    b_counter.fetch_add(512, Ordering::SeqCst);
                    let _ = stream;
                }
            }
        });

        let mut map = self.active_handles.lock().await;
        map.insert(
            tunnel.id.clone(),
            ActiveTunnelHandle {
                is_running,
                bytes,
            },
        );

        Ok(())
    }
}
