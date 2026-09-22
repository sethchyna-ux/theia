use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HostConfig {
    pub id: String,
    pub name: String,
    pub hostname: String,
    pub user: Option<String>,
    pub port: u16,
    pub identity_file: Option<String>,
    pub password: Option<String>,
    pub group: Option<String>,
    pub tags: Vec<String>,
    pub bastion_id: Option<String>,
    pub source: String, // "ssh_config", "bookmark", "direct"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteFileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: u64,
    pub permissions: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TunnelConfig {
    pub id: String,
    pub host_id: String,
    pub tunnel_type: String, // "local", "remote", "dynamic"
    pub local_port: u16,
    pub remote_host: Option<String>,
    pub remote_port: Option<u16>,
    pub enabled: bool,
    pub status: String, // "stopped", "running", "error"
    pub bytes_transferred: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyPairInfo {
    pub name: String,
    pub key_type: String, // "ed25519", "rsa"
    pub public_key: String,
    pub fingerprint: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Snippet {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub script: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerTelemetry {
    pub cpu_usage: f32,
    pub mem_total: u64,
    pub mem_used: u64,
    pub disk_percent: f32,
    pub load_avg: String,
    pub uptime: String,
}
