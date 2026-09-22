use crate::models::HostConfig;
use std::fs;
use std::path::{Path, PathBuf};

pub fn get_bookmarks_path() -> Option<PathBuf> {
    dirs::config_dir().map(|c| c.join("theia-ssh").join("gui_hosts.json"))
}

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

pub fn save_bookmarks(bookmarks: &[HostConfig]) -> Result<(), String> {
    let path = get_bookmarks_path().ok_or("Could not resolve config path")?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(bookmarks).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_hidden_hosts_path() -> Option<PathBuf> {
    dirs::config_dir().map(|c| c.join("theia-ssh").join("hidden_hosts.json"))
}

pub fn load_hidden_hosts() -> Vec<String> {
    let path = match get_hidden_hosts_path() {
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

    serde_json::from_str::<Vec<String>>(&content).unwrap_or_default()
}

pub fn save_hidden_hosts(hidden: &[String]) -> Result<(), String> {
    let path = get_hidden_hosts_path().ok_or("Could not resolve hidden config path")?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(hidden).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn remove_or_hide_host(id: &str) -> Result<(), String> {
    let mut bookmarks = load_bookmarks();
    bookmarks.retain(|h| h.id != id && h.name != id);
    let _ = save_bookmarks(&bookmarks);

    let mut hidden = load_hidden_hosts();
    if !hidden.contains(&id.to_string()) {
        hidden.push(id.to_string());
    }
    save_hidden_hosts(&hidden)
}

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
            if let Some(h) = current.take() {
                if !h.name.contains('*') && !h.name.contains('?') {
                    hosts.push(h);
                }
            }

            if val.contains('*') || val.contains('?') {
                continue;
            }

            current = Some(HostConfig {
                id: format!("ssh_cfg_{}", val),
                name: val.to_string(),
                hostname: val.to_string(),
                user: None,
                port: 22,
                identity_file: None,
                password: None,
                group: Some("OpenSSH Config".to_string()),
                tags: vec!["ssh-config".to_string()],
                bastion_id: None,
                source: "ssh_config".to_string(),
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
                    h.identity_file = Some(expand_tilde(val, &home));
                }
                "proxyjump" => {
                    h.bastion_id = Some(val.to_string());
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

pub fn get_all_hosts() -> Vec<HostConfig> {
    let mut all = load_bookmarks();
    let ssh_hosts = load_ssh_config();
    let hidden = load_hidden_hosts();

    for sh in ssh_hosts {
        if !all.iter().any(|b| b.name == sh.name) {
            all.push(sh);
        }
    }

    all.retain(|h| !hidden.contains(&h.id) && !hidden.contains(&h.name));
    all
}
