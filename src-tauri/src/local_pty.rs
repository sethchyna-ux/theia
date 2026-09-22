use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;

struct PtyInstance {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
}

#[derive(Clone)]
pub struct LocalPtyManager {
    sessions: Arc<Mutex<HashMap<String, Arc<Mutex<PtyInstance>>>>>,
}

impl LocalPtyManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn spawn(
        &self,
        app: AppHandle,
        session_id: String,
        cols: u16,
        rows: u16,
    ) -> Result<(), String> {
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to open PTY: {}", e))?;

        // Determine user's shell
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
        let mut cmd = CommandBuilder::new(&shell);

        // Inherit environment and set working dir to user's home
        if let Some(home) = dirs::home_dir() {
            cmd.cwd(home);
        }
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");

        // Spawn child process in slave
        let _child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn shell: {}", e))?;

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to clone PTY reader: {}", e))?;
        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Failed to take PTY writer: {}", e))?;

        let instance = Arc::new(Mutex::new(PtyInstance {
            master: pair.master,
            writer,
        }));

        {
            let mut map = self.sessions.lock().await;
            map.insert(session_id.clone(), instance);
        }

        // Background reader thread streaming to frontend
        let event_name = format!("ssh-data-{}", session_id);
        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let text = String::from_utf8_lossy(&buf[..n]).to_string();
                        let _ = app.emit(&event_name, text);
                    }
                    Err(_) => break,
                }
            }
        });

        Ok(())
    }

    pub async fn write(&self, session_id: &str, data: &[u8]) -> Result<(), String> {
        let map = self.sessions.lock().await;
        if let Some(inst) = map.get(session_id) {
            let mut guard = inst.lock().await;
            guard
                .writer
                .write_all(data)
                .map_err(|e| format!("Failed to write to PTY: {}", e))?;
            guard
                .writer
                .flush()
                .map_err(|e| format!("Failed to flush PTY: {}", e))?;
            Ok(())
        } else {
            Err(format!("Local PTY session '{}' not found", session_id))
        }
    }

    pub async fn resize(&self, session_id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let map = self.sessions.lock().await;
        if let Some(inst) = map.get(session_id) {
            let guard = inst.lock().await;
            guard
                .master
                .resize(PtySize {
                    rows,
                    cols,
                    pixel_width: 0,
                    pixel_height: 0,
                })
                .map_err(|e| format!("Failed to resize PTY: {}", e))?;
            Ok(())
        } else {
            Err(format!("Local PTY session '{}' not found", session_id))
        }
    }

    pub async fn close(&self, session_id: &str) {
        let mut map = self.sessions.lock().await;
        map.remove(session_id);
    }
}
