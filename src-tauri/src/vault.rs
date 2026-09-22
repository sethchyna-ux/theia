use crate::models::KeyPairInfo;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

pub fn get_vault_dir() -> Option<PathBuf> {
    dirs::config_dir().map(|c| c.join("theia-ssh").join("keys"))
}

pub fn list_keys() -> Vec<KeyPairInfo> {
    let mut keys = Vec::new();

    // 1. Scan default ~/.ssh
    if let Some(home) = dirs::home_dir() {
        let ssh_dir = home.join(".ssh");
        scan_dir_for_keys(&ssh_dir, &mut keys);
    }

    // 2. Scan Theia vault directory
    if let Some(vault_dir) = get_vault_dir() {
        scan_dir_for_keys(&vault_dir, &mut keys);
    }

    keys
}

fn scan_dir_for_keys(dir: &Path, keys: &mut Vec<KeyPairInfo>) {
    if !dir.is_dir() {
        return;
    }

    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("pub") {
                let pub_path = path.clone();
                let priv_path = path.with_extension("");

                if priv_path.exists() {
                    let name = priv_path
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string();

                    if let Ok(content) = fs::read_to_string(&pub_path) {
                        let trimmed = content.trim();
                        let parts: Vec<&str> = trimmed.split_whitespace().collect();
                        let key_type = if !parts.is_empty() {
                            if parts[0].contains("ed25519") {
                                "Ed25519".to_string()
                            } else if parts[0].contains("rsa") {
                                "RSA".to_string()
                            } else if parts[0].contains("ecdsa") {
                                "ECDSA".to_string()
                            } else {
                                parts[0].to_string()
                            }
                        } else {
                            "Unknown".to_string()
                        };

                        // Compute fingerprint using ssh-keygen -l
                        let fp = get_fingerprint(&pub_path).unwrap_or_else(|| "SHA256:...".to_string());

                        keys.push(KeyPairInfo {
                            name,
                            key_type,
                            public_key: trimmed.to_string(),
                            fingerprint: fp,
                            path: priv_path.to_string_lossy().to_string(),
                        });
                    }
                }
            }
        }
    }
}

fn get_fingerprint(pub_key_path: &Path) -> Option<String> {
    let output = Command::new("ssh-keygen")
        .args(["-l", "-f", &pub_key_path.to_string_lossy()])
        .output()
        .ok()?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let parts: Vec<&str> = stdout.split_whitespace().collect();
        if parts.len() >= 2 {
            return Some(parts[1].to_string());
        }
    }
    None
}

pub fn generate_key_pair(name: &str, key_type: &str) -> Result<KeyPairInfo, String> {
    let vault_dir = get_vault_dir().ok_or("Could not resolve vault directory")?;
    fs::create_dir_all(&vault_dir).map_err(|e| e.to_string())?;

    let priv_path = vault_dir.join(name);
    let pub_path = vault_dir.join(format!("{}.pub", name));

    if priv_path.exists() {
        return Err(format!("A key named '{}' already exists", name));
    }

    let kt = if key_type.eq_ignore_ascii_case("rsa") {
        "rsa"
    } else {
        "ed25519"
    };

    let mut cmd = Command::new("ssh-keygen");
    cmd.args(["-t", kt, "-N", "", "-f", &priv_path.to_string_lossy(), "-C", &format!("theia-{}", name)]);
    if kt == "rsa" {
        cmd.args(["-b", "4096"]);
    }

    let output = cmd.output().map_err(|e| format!("Failed to run ssh-keygen: {e}"))?;
    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ssh-keygen failed: {err}"));
    }

    let public_key = fs::read_to_string(&pub_path).map_err(|e| e.to_string())?;
    let fp = get_fingerprint(&pub_path).unwrap_or_else(|| "SHA256:...".to_string());

    Ok(KeyPairInfo {
        name: name.to_string(),
        key_type: if kt == "rsa" { "RSA-4096".to_string() } else { "Ed25519".to_string() },
        public_key: public_key.trim().to_string(),
        fingerprint: fp,
        path: priv_path.to_string_lossy().to_string(),
    })
}
