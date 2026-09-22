use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshServerStatus {
    pub running: bool,
    pub port: u16,
    pub listen_address: String,
    pub pid: Option<u32>,
    pub host_key_fingerprint: Option<String>,
    pub lan_ips: Vec<String>,
    pub authorized_keys_count: usize,
    pub username: String,
    pub log_tail: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshServerConfig {
    pub port: u16,
    pub listen_address: String,
    pub allow_password: bool,
    pub allow_pubkey: bool,
}

pub struct SshServerManager {
    child: Mutex<Option<Child>>,
    current_port: Mutex<u16>,
    current_addr: Mutex<String>,
}

impl SshServerManager {
    pub fn new() -> Self {
        Self {
            child: Mutex::new(None),
            current_port: Mutex::new(2222),
            current_addr: Mutex::new("0.0.0.0".to_string()),
        }
    }

    fn get_server_dir() -> PathBuf {
        let base = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        base.join(".theia").join("ssh_server")
    }

    fn ensure_keys_and_config(
        port: u16,
        listen_addr: &str,
        allow_pwd: bool,
        allow_pub: bool,
    ) -> Result<(PathBuf, PathBuf), String> {
        let dir = Self::get_server_dir();
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create ssh_server dir: {}", e))?;

        let host_key = dir.join("ssh_host_ed25519_key");
        if !host_key.exists() {
            let status = Command::new("ssh-keygen")
                .arg("-t")
                .arg("ed25519")
                .arg("-N")
                .arg("")
                .arg("-f")
                .arg(&host_key)
                .status()
                .map_err(|e| format!("Failed to generate host key: {}", e))?;

            if !status.success() {
                return Err("Failed to generate host key with ssh-keygen".to_string());
            }
        }

        let auth_keys = dir.join("authorized_keys");
        if !auth_keys.exists() {
            // If user has ~/.ssh/authorized_keys or id_ed25519.pub, copy as default
            let mut initial_keys = String::new();
            if let Some(home) = dirs::home_dir() {
                let user_pub = home.join(".ssh").join("id_ed25519.pub");
                if user_pub.exists() {
                    if let Ok(content) = fs::read_to_string(&user_pub) {
                        initial_keys.push_str(&content);
                    }
                }
                let user_rsa_pub = home.join(".ssh").join("id_rsa.pub");
                if user_rsa_pub.exists() {
                    if let Ok(content) = fs::read_to_string(&user_rsa_pub) {
                        initial_keys.push_str(&content);
                    }
                }
            }
            let _ = fs::write(&auth_keys, initial_keys);
        }

        let config_file = dir.join("sshd_config");
        let pwd_val = if allow_pwd { "yes" } else { "no" };
        let pub_val = if allow_pub { "yes" } else { "no" };

        let config_content = format!(
            "Port {}\nListenAddress {}\nHostKey {}\nAuthorizedKeysFile {}\nPasswordAuthentication {}\nPubkeyAuthentication {}\nPidFile {}\nStrictModes no\n",
            port,
            listen_addr,
            host_key.display(),
            auth_keys.display(),
            pwd_val,
            pub_val,
            dir.join("sshd.pid").display()
        );

        fs::write(&config_file, config_content)
            .map_err(|e| format!("Failed to write sshd_config: {}", e))?;

        Ok((config_file, host_key))
    }

    pub fn start(&self, config: SshServerConfig) -> Result<SshServerStatus, String> {
        let mut child_guard = self.child.lock().unwrap();

        // Check if already running
        if let Some(ref mut c) = *child_guard {
            match c.try_wait() {
                Ok(None) => return Err("SSH Server is already running".to_string()),
                _ => {}
            }
        }

        let (config_file, host_key) = Self::ensure_keys_and_config(
            config.port,
            &config.listen_address,
            config.allow_password,
            config.allow_pubkey,
        )?;

        let log_file = Self::get_server_dir().join("sshd.log");
        let log_out = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_file)
            .map_err(|e| format!("Failed to open sshd log file: {}", e))?;

        let log_err = log_out
            .try_clone()
            .map_err(|e| format!("Failed to clone log file: {}", e))?;

        // Launch /usr/sbin/sshd -D (daemon in foreground) -e (log to stderr) -f config -h host_key
        let child = Command::new("/usr/sbin/sshd")
            .arg("-D")
            .arg("-e")
            .arg("-f")
            .arg(&config_file)
            .arg("-h")
            .arg(&host_key)
            .stdout(log_out)
            .stderr(log_err)
            .spawn()
            .map_err(|e| format!("Failed to spawn /usr/sbin/sshd: {}", e))?;

        *self.current_port.lock().unwrap() = config.port;
        *self.current_addr.lock().unwrap() = config.listen_address.clone();
        *child_guard = Some(child);

        drop(child_guard);
        Ok(self.get_status())
    }

    pub fn stop(&self) -> Result<SshServerStatus, String> {
        let mut child_guard = self.child.lock().unwrap();

        if let Some(mut c) = child_guard.take() {
            let _ = c.kill();
            let _ = c.wait();
        }

        // Also check and clean up PID file if any
        let pid_file = Self::get_server_dir().join("sshd.pid");
        if pid_file.exists() {
            if let Ok(pid_str) = fs::read_to_string(&pid_file) {
                if let Ok(pid) = pid_str.trim().parse::<i32>() {
                    let _ = Command::new("kill").arg(pid.to_string()).output();
                }
            }
            let _ = fs::remove_file(&pid_file);
        }

        drop(child_guard);
        Ok(self.get_status())
    }

    pub fn get_status(&self) -> SshServerStatus {
        let mut child_guard = self.child.lock().unwrap();
        let mut running = false;
        let mut pid = None;

        if let Some(ref mut c) = *child_guard {
            match c.try_wait() {
                Ok(None) => {
                    running = true;
                    pid = Some(c.id());
                }
                _ => {
                    *child_guard = None;
                }
            }
        }

        let port = *self.current_port.lock().unwrap();
        let listen_address = self.current_addr.lock().unwrap().clone();

        // Fingerprint
        let dir = Self::get_server_dir();
        let host_pub = dir.join("ssh_host_ed25519_key.pub");
        let host_key_fingerprint = if host_pub.exists() {
            let out = Command::new("ssh-keygen")
                .arg("-l")
                .arg("-E")
                .arg("sha256")
                .arg("-f")
                .arg(&host_pub)
                .output()
                .ok();
            out.and_then(|o| {
                if o.status.success() {
                    let s = String::from_utf8_lossy(&o.stdout);
                    s.split_whitespace().nth(1).map(|fp| fp.to_string())
                } else {
                    None
                }
            })
        } else {
            None
        };

        // Authorized keys count
        let auth_keys_path = dir.join("authorized_keys");
        let authorized_keys_count = if auth_keys_path.exists() {
            fs::read_to_string(&auth_keys_path)
                .map(|c| c.lines().filter(|l| !l.trim().is_empty() && !l.starts_with('#')).count())
                .unwrap_or(0)
        } else {
            0
        };

        // Current username
        let username = std::env::var("USER").unwrap_or_else(|_| "user".to_string());

        // LAN IPs
        let lan_ips = Self::get_local_ips();

        // Recent logs
        let log_file = dir.join("sshd.log");
        let log_tail = if log_file.exists() {
            fs::read_to_string(&log_file)
                .map(|c| {
                    c.lines()
                        .rev()
                        .take(20)
                        .map(|s| s.to_string())
                        .collect::<Vec<String>>()
                        .into_iter()
                        .rev()
                        .collect()
                })
                .unwrap_or_default()
        } else {
            Vec::new()
        };

        SshServerStatus {
            running,
            port,
            listen_address,
            pid,
            host_key_fingerprint,
            lan_ips,
            authorized_keys_count,
            username,
            log_tail,
        }
    }

    fn get_local_ips() -> Vec<String> {
        let mut ips = Vec::new();

        // Query ifconfig on macOS to extract inet addresses
        if let Ok(output) = Command::new("ifconfig").output() {
            let out = String::from_utf8_lossy(&output.stdout);
            for line in out.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("inet ") {
                    let parts: Vec<&str> = trimmed.split_whitespace().collect();
                    if parts.len() >= 2 {
                        let ip = parts[1];
                        if ip != "127.0.0.1" && !ip.starts_with("169.254.") {
                            ips.push(ip.to_string());
                        }
                    }
                }
            }
        }

        if ips.is_empty() {
            ips.push("127.0.0.1".to_string());
        }

        ips
    }

    pub fn get_authorized_keys(&self) -> Vec<String> {
        let path = Self::get_server_dir().join("authorized_keys");
        if path.exists() {
            fs::read_to_string(&path)
                .map(|c| {
                    c.lines()
                        .filter(|l| !l.trim().is_empty() && !l.starts_with('#'))
                        .map(|s| s.to_string())
                        .collect()
                })
                .unwrap_or_default()
        } else {
            Vec::new()
        }
    }

    pub fn add_authorized_key(&self, key: &str) -> Result<Vec<String>, String> {
        let path = Self::get_server_dir().join("authorized_keys");
        let mut current = self.get_authorized_keys();
        let trimmed = key.trim();
        if !trimmed.is_empty() && !current.contains(&trimmed.to_string()) {
            current.push(trimmed.to_string());
            let joined = current.join("\n") + "\n";
            fs::write(&path, joined).map_err(|e| format!("Failed to write authorized_keys: {}", e))?;
        }
        Ok(current)
    }

    pub fn remove_authorized_key(&self, key: &str) -> Result<Vec<String>, String> {
        let path = Self::get_server_dir().join("authorized_keys");
        let mut current = self.get_authorized_keys();
        current.retain(|k| k != key.trim());
        let joined = current.join("\n") + "\n";
        fs::write(&path, joined).map_err(|e| format!("Failed to write authorized_keys: {}", e))?;
        Ok(current)
    }
}
