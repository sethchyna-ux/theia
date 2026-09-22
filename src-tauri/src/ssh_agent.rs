use serde::{Deserialize, Serialize};
use std::env;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshAgentStatus {
    pub active: bool,
    pub socket_path: Option<String>,
    pub identities_count: usize,
    pub is_locked: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshIdentity {
    pub bits: Option<u32>,
    pub fingerprint: String,
    pub comment: String,
    pub algorithm: String,
}

pub fn get_agent_status() -> SshAgentStatus {
    let socket = env::var("SSH_AUTH_SOCK").ok();

    if socket.is_none() {
        return SshAgentStatus {
            active: false,
            socket_path: None,
            identities_count: 0,
            is_locked: false,
            error: Some("SSH_AUTH_SOCK environment variable is not set".to_string()),
        };
    }

    let socket_path = socket.clone().unwrap();

    // Query ssh-add -l to test agent responsiveness
    let output = Command::new("ssh-add")
        .arg("-l")
        .arg("-E")
        .arg("sha256")
        .output();

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let stderr = String::from_utf8_lossy(&out.stderr);

            if out.status.success() {
                let lines: Vec<&str> = stdout.trim().lines().filter(|l| !l.is_empty()).collect();
                SshAgentStatus {
                    active: true,
                    socket_path: Some(socket_path),
                    identities_count: lines.len(),
                    is_locked: false,
                    error: None,
                }
            } else if stdout.contains("The agent has no identities")
                || stderr.contains("The agent has no identities")
            {
                SshAgentStatus {
                    active: true,
                    socket_path: Some(socket_path),
                    identities_count: 0,
                    is_locked: false,
                    error: None,
                }
            } else if stderr.contains("agent is locked") || stdout.contains("agent is locked") {
                SshAgentStatus {
                    active: true,
                    socket_path: Some(socket_path),
                    identities_count: 0,
                    is_locked: true,
                    error: Some("Agent is locked".to_string()),
                }
            } else {
                let err_msg = if !stderr.is_empty() {
                    stderr.to_string()
                } else {
                    stdout.to_string()
                };
                SshAgentStatus {
                    active: false,
                    socket_path: Some(socket_path),
                    identities_count: 0,
                    is_locked: false,
                    error: Some(err_msg.trim().to_string()),
                }
            }
        }
        Err(e) => SshAgentStatus {
            active: false,
            socket_path: Some(socket_path),
            identities_count: 0,
            is_locked: false,
            error: Some(format!("Failed to execute ssh-add: {}", e)),
        },
    }
}

pub fn list_agent_identities() -> Result<Vec<SshIdentity>, String> {
    let output = Command::new("ssh-add")
        .arg("-l")
        .arg("-E")
        .arg("sha256")
        .output()
        .map_err(|e| format!("Failed to run ssh-add: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if !output.status.success() {
        if stdout.contains("The agent has no identities")
            || stderr.contains("The agent has no identities")
        {
            return Ok(Vec::new());
        }
        return Err(if !stderr.is_empty() {
            stderr.to_string()
        } else {
            stdout.to_string()
        });
    }

    let mut identities = Vec::new();

    // Line format: 256 SHA256:abcd... /path/to/key (ED25519)
    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 3 {
            let bits = parts[0].parse::<u32>().ok();
            let fingerprint = parts[1].to_string();

            // Algorithm is usually the last part in parentheses: (ED25519) or (RSA)
            let (algorithm, comment) = if let Some(last) = parts.last() {
                if last.starts_with('(') && last.ends_with(')') {
                    let algo = last.trim_matches(|c| c == '(' || c == ')').to_string();
                    let comm = parts[2..parts.len() - 1].join(" ");
                    (algo, comm)
                } else {
                    let comm = parts[2..].join(" ");
                    ("UNKNOWN".to_string(), comm)
                }
            } else {
                let comm = parts[2..].join(" ");
                ("UNKNOWN".to_string(), comm)
            };

            identities.push(SshIdentity {
                bits,
                fingerprint,
                comment,
                algorithm,
            });
        }
    }

    Ok(identities)
}

pub fn add_key_to_agent(
    key_path: &str,
    lifetime_secs: Option<u32>,
) -> Result<String, String> {
    let mut cmd = Command::new("ssh-add");

    if let Some(t) = lifetime_secs {
        if t > 0 {
            cmd.arg("-t").arg(t.to_string());
        }
    }

    // Expand ~ in path
    let expanded_path = if key_path.starts_with("~/") {
        if let Some(home) = dirs::home_dir() {
            home.join(&key_path[2..]).to_string_lossy().to_string()
        } else {
            key_path.to_string()
        }
    } else {
        key_path.to_string()
    };

    cmd.arg(&expanded_path);
    cmd.stdin(std::process::Stdio::null());
    cmd.env("SSH_ASKPASS_REQUIRE", "force");
    cmd.env("SSH_ASKPASS", "/usr/bin/false");

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute ssh-add: {}", e))?;

    if output.status.success() {
        let out = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let err = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Ok(if !out.is_empty() { out } else if !err.is_empty() { err } else { format!("Identity added: {}", key_path) })
    } else {
        // Try with macOS Keychain flag
        let kc_output = Command::new("ssh-add")
            .arg("--apple-use-keychain")
            .arg(&expanded_path)
            .stdin(std::process::Stdio::null())
            .env("SSH_ASKPASS_REQUIRE", "force")
            .env("SSH_ASKPASS", "/usr/bin/false")
            .output();

        if let Ok(kc_out) = kc_output {
            if kc_out.status.success() {
                return Ok(format!("Identity added via macOS Keychain: {}", key_path));
            }
        }

        let err = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(if !err.is_empty() { err } else { "Failed to add key to ssh-agent (key may be protected by a passphrase)".to_string() })
    }
}

pub fn remove_key_from_agent(key_path: &str) -> Result<String, String> {
    let expanded_path = if key_path.starts_with("~/") {
        if let Some(home) = dirs::home_dir() {
            home.join(&key_path[2..]).to_string_lossy().to_string()
        } else {
            key_path.to_string()
        }
    } else {
        key_path.to_string()
    };

    let output = Command::new("ssh-add")
        .arg("-d")
        .arg(&expanded_path)
        .output()
        .map_err(|e| format!("Failed to run ssh-add: {}", e))?;

    if output.status.success() {
        Ok(format!("Identity removed: {}", key_path))
    } else {
        let err = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(if !err.is_empty() { err } else { "Failed to remove key from agent".to_string() })
    }
}

pub fn clear_all_agent_keys() -> Result<String, String> {
    let output = Command::new("ssh-add")
        .arg("-D")
        .output()
        .map_err(|e| format!("Failed to run ssh-add: {}", e))?;

    if output.status.success() {
        Ok("All identities removed from ssh-agent.".to_string())
    } else {
        let err = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(if !err.is_empty() { err } else { "Failed to clear identities".to_string() })
    }
}

pub fn auto_configure_agent() -> Result<String, String> {
    // 1. Verify if SSH_AUTH_SOCK is active; if not, spawn ssh-agent
    let current_status = get_agent_status();
    if !current_status.active || current_status.socket_path.is_none() {
        if let Ok(out) = Command::new("ssh-agent")
            .arg("-s")
            .stdin(std::process::Stdio::null())
            .output()
        {
            let stdout = String::from_utf8_lossy(&out.stdout);
            for line in stdout.lines() {
                if line.starts_with("SSH_AUTH_SOCK=") {
                    if let Some(val) = line.split(';').next() {
                        let path = val.trim_start_matches("SSH_AUTH_SOCK=").trim();
                        env::set_var("SSH_AUTH_SOCK", path);
                    }
                }
            }
        }
    }

    let socket_path = env::var("SSH_AUTH_SOCK").unwrap_or_else(|_| "active agent".to_string());
    let mut added_keys = Vec::new();
    let mut skipped_keys = Vec::new();

    // 2. Discover private keys in ~/.ssh/ and ~/.theia/vault/
    if let Some(home) = dirs::home_dir() {
        let ssh_dir = home.join(".ssh");
        if ssh_dir.is_dir() {
            if let Ok(entries) = std::fs::read_dir(&ssh_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file() {
                        let file_name = path.file_name().unwrap_or_default().to_string_lossy();
                        if file_name.ends_with(".pub")
                            || file_name == "known_hosts"
                            || file_name == "known_hosts.old"
                            || file_name == "authorized_keys"
                            || file_name == "config"
                            || file_name.starts_with('.')
                        {
                            continue;
                        }

                        // Check if key is unencrypted or in keychain
                        let is_unencrypted = Command::new("ssh-keygen")
                            .arg("-y")
                            .arg("-P")
                            .arg("")
                            .arg("-f")
                            .arg(&path)
                            .stdin(std::process::Stdio::null())
                            .output()
                            .map(|o| o.status.success())
                            .unwrap_or(false);

                        if is_unencrypted {
                            let out = Command::new("ssh-add")
                                .arg(&path)
                                .stdin(std::process::Stdio::null())
                                .env("SSH_ASKPASS_REQUIRE", "force")
                                .env("SSH_ASKPASS", "/usr/bin/false")
                                .output();
                            if out.map(|o| o.status.success()).unwrap_or(false) {
                                added_keys.push(file_name.to_string());
                            }
                        } else {
                            // Try Apple Keychain without blocking
                            let out = Command::new("ssh-add")
                                .arg("--apple-use-keychain")
                                .arg(&path)
                                .stdin(std::process::Stdio::null())
                                .env("SSH_ASKPASS_REQUIRE", "force")
                                .env("SSH_ASKPASS", "/usr/bin/false")
                                .output();
                            if out.map(|o| o.status.success()).unwrap_or(false) {
                                added_keys.push(format!("{} (keychain)", file_name));
                            } else {
                                skipped_keys.push(format!("{} (passphrase protected)", file_name));
                            }
                        }
                    }
                }
            }
        }

        let vault_dir = home.join(".theia").join("vault");
        if vault_dir.exists() {
            if let Ok(entries) = std::fs::read_dir(&vault_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file() && !path.extension().map_or(false, |ext| ext == "pub") {
                        let file_name = path.file_name().unwrap_or_default().to_string_lossy();
                        let is_unencrypted = Command::new("ssh-keygen")
                            .arg("-y")
                            .arg("-P")
                            .arg("")
                            .arg("-f")
                            .arg(&path)
                            .stdin(std::process::Stdio::null())
                            .output()
                            .map(|o| o.status.success())
                            .unwrap_or(false);

                        if is_unencrypted {
                            let _ = Command::new("ssh-add")
                                .arg(&path)
                                .stdin(std::process::Stdio::null())
                                .env("SSH_ASKPASS_REQUIRE", "force")
                                .env("SSH_ASKPASS", "/usr/bin/false")
                                .output();
                            added_keys.push(format!("vault/{}", file_name));
                        }
                    }
                }
            }
        }
    }

    let summary = if !added_keys.is_empty() {
        if !skipped_keys.is_empty() {
            format!(
                "Configured agent ({}). Loaded {} keys: {}. Note: {} skipped (requires passphrase).",
                socket_path,
                added_keys.len(),
                added_keys.join(", "),
                skipped_keys.join(", ")
            )
        } else {
            format!(
                "Configured agent ({}). Loaded {} keys: {}.",
                socket_path,
                added_keys.len(),
                added_keys.join(", ")
            )
        }
    } else if !skipped_keys.is_empty() {
        format!(
            "Configured agent ({}). Found keys but they require a passphrase: {}.",
            socket_path,
            skipped_keys.join(", ")
        )
    } else {
        format!("Configured agent ({}). No local SSH keys found to load.", socket_path)
    };

    Ok(summary)
}
