use crate::error::{AppError, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum HostSource {
    SshConfig,
    Bookmark,
    Direct,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HostConfig {
    pub name: String,
    pub hostname: String,
    pub user: Option<String>,
    pub port: u16,
    pub identity_file: Option<String>,
    pub description: Option<String>,
    pub source: HostSource,
}

impl HostConfig {
    #[allow(dead_code)]
    pub fn new(name: String, hostname: String, user: Option<String>, port: u16) -> Self {
        Self {
            name,
            hostname,
            user,
            port,
            identity_file: None,
            description: None,
            source: HostSource::Direct,
        }
    }

    /// Display string e.g. `user@hostname:22`
    pub fn display_target(&self) -> String {
        let user_prefix = self
            .user
            .as_deref()
            .map(|u| format!("{u}@"))
            .unwrap_or_default();
        if self.port != 22 {
            format!("{}{}:{}", user_prefix, self.hostname, self.port)
        } else {
            format!("{}{}", user_prefix, self.hostname)
        }
    }
}

/// Parse a target string formatted as `[user@]hostname[:port]`
pub fn parse_target(target: &str) -> Result<HostConfig> {
    let target = target.trim();
    if target.is_empty() {
        return Err(AppError::InvalidTarget(target.to_string()));
    }

    let (user, remainder) = if let Some((u, rest)) = target.split_once('@') {
        if u.is_empty() || rest.is_empty() {
            return Err(AppError::InvalidTarget(target.to_string()));
        }
        (Some(u.to_string()), rest)
    } else {
        (None, target)
    };

    let (hostname, port) = if let Some((h, p_str)) = remainder.split_once(':') {
        let port_num = p_str
            .parse::<u16>()
            .map_err(|_| AppError::InvalidTarget(target.to_string()))?;
        (h.to_string(), port_num)
    } else {
        (remainder.to_string(), 22)
    };

    if hostname.is_empty() {
        return Err(AppError::InvalidTarget(target.to_string()));
    }

    let name = hostname.clone();

    Ok(HostConfig {
        name,
        hostname,
        user,
        port,
        identity_file: None,
        description: None,
        source: HostSource::Direct,
    })
}

/// Parse `~/.ssh/config` if it exists.
pub fn load_ssh_config() -> Vec<HostConfig> {
    let mut hosts = Vec::new();
    let home = match dirs::home_dir() {
        Some(h) => h,
        None => return hosts,
    };

    let config_path = home.join(".ssh").join("config");
    if !config_path.is_file() {
        return hosts;
    }

    let content = match fs::read_to_string(&config_path) {
        Ok(c) => c,
        Err(_) => return hosts,
    };

    let mut current: Option<HostConfig> = None;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        // Split by whitespace or equals
        let mut parts = trimmed.split_whitespace();
        let key = match parts.next() {
            Some(k) => k.to_lowercase(),
            None => continue,
        };
        let val = match parts.next() {
            Some(v) => v,
            None => continue,
        };

        if key == "host" {
            // Commit previous host if valid
            if let Some(h) = current.take() {
                if !h.name.contains('*') && !h.name.contains('?') {
                    hosts.push(h);
                }
            }

            // Skip wildcards
            if val.contains('*') || val.contains('?') {
                continue;
            }

            current = Some(HostConfig {
                name: val.to_string(),
                hostname: val.to_string(),
                user: None,
                port: 22,
                identity_file: None,
                description: Some("From ~/.ssh/config".to_string()),
                source: HostSource::SshConfig,
            });
        } else if let Some(ref mut h) = current {
            match key.as_str() {
                "hostname" => h.hostname = val.to_string(),
                "user" => h.user = Some(val.to_string()),
                "port" => {
                    if let Ok(p) = val.parse::<u16>() {
                        h.port = p;
                    }
                }
                "identityfile" => {
                    let expanded = expand_tilde(val, &home);
                    h.identity_file = Some(expanded);
                }
                _ => {}
            }
        }
    }

    if let Some(h) = current {
        if !h.name.contains('*') && !h.name.contains('?') {
            hosts.push(h);
        }
    }

    hosts
}

fn expand_tilde(path: &str, home: &Path) -> String {
    if let Some(stripped) = path.strip_prefix("~/") {
        home.join(stripped).to_string_lossy().to_string()
    } else {
        path.to_string()
    }
}

/// Path to `~/.config/theia-ssh/hosts.json`
pub fn get_bookmarks_path() -> Option<PathBuf> {
    dirs::config_dir().map(|c| c.join("theia-ssh").join("hosts.json"))
}

/// Load saved bookmarks from `~/.config/theia-ssh/hosts.json`
pub fn load_bookmarks() -> Vec<HostConfig> {
    let path = match get_bookmarks_path() {
        Some(p) => p,
        None => return Vec::new(),
    };

    if !path.is_file() {
        return Vec::new();
    }

    let content = match fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };

    serde_json::from_str::<Vec<HostConfig>>(&content).unwrap_or_default()
}

/// Save bookmarks to `~/.config/theia-ssh/hosts.json`
pub fn save_bookmarks(bookmarks: &[HostConfig]) -> Result<()> {
    let path = match get_bookmarks_path() {
        Some(p) => p,
        None => {
            return Err(AppError::Config {
                path: PathBuf::from("~/.config/theia-ssh"),
                message: "Could not locate user configuration directory".to_string(),
            })
        }
    };

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let json = serde_json::to_string_pretty(bookmarks).map_err(|e| AppError::Config {
        path: path.clone(),
        message: e.to_string(),
    })?;

    fs::write(&path, json)?;
    Ok(())
}

/// Combined list of hosts (bookmarks first, followed by ~/.ssh/config)
pub fn get_all_hosts() -> Vec<HostConfig> {
    let mut all = load_bookmarks();
    let ssh_hosts = load_ssh_config();

    for sh in ssh_hosts {
        if !all.iter().any(|b| b.name == sh.name) {
            all.push(sh);
        }
    }

    all
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_target_full() {
        let res = parse_target("alex@bastion.example.com:2222").unwrap();
        assert_eq!(res.user.as_deref(), Some("alex"));
        assert_eq!(res.hostname, "bastion.example.com");
        assert_eq!(res.port, 2222);
        assert_eq!(res.display_target(), "alex@bastion.example.com:2222");
    }

    #[test]
    fn test_parse_target_default_port() {
        let res = parse_target("ubuntu@192.168.1.100").unwrap();
        assert_eq!(res.user.as_deref(), Some("ubuntu"));
        assert_eq!(res.hostname, "192.168.1.100");
        assert_eq!(res.port, 22);
        assert_eq!(res.display_target(), "ubuntu@192.168.1.100");
    }

    #[test]
    fn test_parse_target_hostname_only() {
        let res = parse_target("github.com").unwrap();
        assert_eq!(res.user, None);
        assert_eq!(res.hostname, "github.com");
        assert_eq!(res.port, 22);
        assert_eq!(res.display_target(), "github.com");
    }

    #[test]
    fn test_parse_target_hostname_custom_port() {
        let res = parse_target("localhost:8022").unwrap();
        assert_eq!(res.user, None);
        assert_eq!(res.hostname, "localhost");
        assert_eq!(res.port, 8022);
        assert_eq!(res.display_target(), "localhost:8022");
    }

    #[test]
    fn test_parse_target_invalid() {
        assert!(parse_target("").is_err());
        assert!(parse_target("user@").is_err());
        assert!(parse_target("@host").is_err());
        assert!(parse_target("host:notaport").is_err());
    }

    #[test]
    fn test_bookmark_serialization_roundtrip() {
        let host = HostConfig {
            name: "test-server".to_string(),
            hostname: "10.0.0.1".to_string(),
            user: Some("deploy".to_string()),
            port: 22,
            identity_file: Some("/path/to/key".to_string()),
            description: Some("Production node".to_string()),
            source: HostSource::Bookmark,
        };

        let json = serde_json::to_string(&host).unwrap();
        let decoded: HostConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded.name, "test-server");
        assert_eq!(decoded.hostname, "10.0.0.1");
        assert_eq!(decoded.user.as_deref(), Some("deploy"));
        assert_eq!(decoded.port, 22);
    }
}

