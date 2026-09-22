use crate::models::KnownHostEntry;
use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::engine::general_purpose::STANDARD_NO_PAD as BASE64_NO_PAD;
use base64::Engine;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;

pub fn get_known_hosts_path() -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join(".ssh").join("known_hosts"))
}

pub fn get_known_hosts() -> Vec<KnownHostEntry> {
    let mut entries = Vec::new();
    let path = match get_known_hosts_path() {
        Some(p) if p.is_file() => p,
        _ => return entries,
    };

    let content = match fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return entries,
    };

    for (idx, line) in content.lines().enumerate() {
        let line_num = idx + 1;
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.len() < 3 {
            continue;
        }

        let (host_str, key_type, key_b64) = if parts[0].starts_with('@') {
            if parts.len() < 4 {
                continue;
            }
            (format!("{} {}", parts[0], parts[1]), parts[2], parts[3])
        } else {
            (parts[0].to_string(), parts[1], parts[2])
        };

        let fingerprint = compute_fingerprint(key_b64);
        let is_hashed = host_str.starts_with("|1|");

        entries.push(KnownHostEntry {
            line_number: line_num,
            host: host_str,
            key_type: key_type.to_string(),
            key_base64: key_b64.to_string(),
            fingerprint,
            is_hashed,
        });
    }

    entries
}

fn compute_fingerprint(key_b64: &str) -> String {
    if let Ok(raw) = BASE64_STANDARD.decode(key_b64.trim()) {
        let mut hasher = Sha256::new();
        hasher.update(&raw);
        let hash = hasher.finalize();
        let b64 = BASE64_NO_PAD.encode(hash);
        format!("SHA256:{}", b64)
    } else {
        "Invalid Base64".to_string()
    }
}

pub fn remove_known_host(line_number: usize) -> Result<(), String> {
    let path = get_known_hosts_path().ok_or("Cannot resolve ~/.ssh/known_hosts path")?;
    if !path.exists() {
        return Err("known_hosts file does not exist".to_string());
    }

    let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read known_hosts: {e}"))?;
    let lines: Vec<&str> = content.lines().collect();

    if line_number == 0 || line_number > lines.len() {
        return Err(format!("Invalid line number: {line_number}"));
    }

    let mut new_lines = Vec::with_capacity(lines.len());
    for (idx, line) in lines.into_iter().enumerate() {
        if idx + 1 != line_number {
            new_lines.push(line);
        }
    }

    let updated_content = if new_lines.is_empty() {
        String::new()
    } else {
        format!("{}\n", new_lines.join("\n"))
    };

    fs::write(&path, updated_content).map_err(|e| format!("Failed to write updated known_hosts: {e}"))?;
    Ok(())
}
