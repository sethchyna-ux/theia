use crate::models::KeyPairInfo;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PasskeyDeviceInfo {
    pub id: String,
    pub name: String,
    pub device_type: String, // "yubikey" | "touch_id" | "fido2_generic"
    pub description: String,
    pub algorithms_supported: Vec<String>,
    pub supports_resident: bool,
    pub supports_pin_touch: bool,
    pub is_connected: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GeneratePasskeyOptions {
    pub name: String,
    pub key_type: String, // "ed25519-sk" | "ecdsa-sk"
    pub resident: bool,
    pub verify_required: bool,
    pub application: Option<String>,
    pub device_target: String, // "yubikey" | "touch_id" | "auto"
}

/// Resolves the optimal ssh tool binary (prioritizing Homebrew FIDO2-enabled OpenSSH)
pub fn resolve_ssh_tool(tool_name: &str) -> PathBuf {
    let candidates = [
        format!("/opt/homebrew/bin/{}", tool_name),
        format!("/usr/local/bin/{}", tool_name),
        format!("/usr/bin/{}", tool_name),
    ];

    for path in &candidates {
        let p = Path::new(path);
        if p.is_file() {
            return p.to_path_buf();
        }
    }

    PathBuf::from(tool_name)
}

/// Queries available passkey hardware devices (YubiKey USB/NFC & Apple Touch ID)
pub fn get_passkey_capabilities() -> Vec<PasskeyDeviceInfo> {
    let mut devices = Vec::new();

    // 1. Detect Yubico / USB FIDO2 hardware tokens
    let usb_probe = Command::new("system_profiler")
        .args(["SPUSBDataType"])
        .output();

    let mut yubikey_detected = false;
    if let Ok(out) = usb_probe {
        let text = String::from_utf8_lossy(&out.stdout).to_lowercase();
        if text.contains("yubikey") || text.contains("yubico") || text.contains("fido") {
            yubikey_detected = true;
        }
    }

    devices.push(PasskeyDeviceInfo {
        id: "yubikey_fido2".to_string(),
        name: "Yubico YubiKey (FIDO2 / U2F Hardware)".to_string(),
        device_type: "yubikey".to_string(),
        description: "Hardware token via USB-C, USB-A, or NFC. Cryptographically enforces physical touch or PIN for every connection.".to_string(),
        algorithms_supported: vec!["ed25519-sk".to_string(), "ecdsa-sk".to_string()],
        supports_resident: true,
        supports_pin_touch: true,
        is_connected: yubikey_detected,
    });

    // 2. Detect Apple Mac Touch ID / Secure Enclave
    // macOS has Touch ID on all modern MacBooks and Apple Magic Keyboards with Touch ID
    let biometrics_probe = Command::new("bioutil")
        .args(["-r"])
        .output();

    let touch_id_detected = biometrics_probe.map(|o| o.status.success()).unwrap_or(true);

    devices.push(PasskeyDeviceInfo {
        id: "mac_touch_id".to_string(),
        name: "Apple Mac Touch ID (Biometric Secure Enclave)".to_string(),
        device_type: "touch_id".to_string(),
        description: "Hardware-backed biometric passkey verified by Apple's built-in Touch ID sensor and Secure Enclave coprocessor.".to_string(),
        algorithms_supported: vec!["ecdsa-sk".to_string(), "ed25519-sk".to_string()],
        supports_resident: true,
        supports_pin_touch: true,
        is_connected: touch_id_detected,
    });

    devices
}

/// Generates a FIDO2 / Passkey SSH key pair using YubiKey or Mac Touch ID
pub fn generate_passkey(opts: GeneratePasskeyOptions) -> Result<KeyPairInfo, String> {
    let home = dirs::home_dir().ok_or("Could not resolve home directory")?;
    let ssh_dir = home.join(".ssh");
    fs::create_dir_all(&ssh_dir).map_err(|e| e.to_string())?;

    let clean_name = opts.name.trim();
    if clean_name.is_empty() {
        return Err("Passkey name cannot be empty".to_string());
    }

    let target_priv_path = ssh_dir.join(clean_name);
    let target_pub_path = ssh_dir.join(format!("{}.pub", clean_name));

    if target_priv_path.exists() {
        return Err(format!("Key '{}' already exists in ~/.ssh/", clean_name));
    }

    let keygen_bin = resolve_ssh_tool("ssh-keygen");
    let mut cmd = Command::new(&keygen_bin);

    let ktype = match opts.key_type.as_str() {
        "ecdsa-sk" => "ecdsa-sk",
        _ => "ed25519-sk",
    };

    cmd.arg("-t").arg(ktype);
    cmd.arg("-f").arg(&target_priv_path);
    cmd.arg("-N").arg(""); // No software passphrase, hardware token provides protection
    cmd.arg("-C").arg(format!("theia-passkey:{}", clean_name));

    if opts.resident {
        cmd.arg("-O").arg("resident");
    }

    if opts.verify_required {
        cmd.arg("-O").arg("verify-required");
    }

    if let Some(ref app) = opts.application {
        if !app.trim().is_empty() {
            cmd.arg("-O").arg(format!("application={}", app.trim()));
        }
    }

    // Explicitly pass FIDO provider if available
    let fido_lib = Path::new("/opt/homebrew/lib/libfido2.dylib");
    if fido_lib.exists() && opts.device_target == "yubikey" {
        cmd.env("SSH_SK_PROVIDER", fido_lib);
    }

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to run ssh-keygen: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let err_msg = if !stderr.is_empty() { stderr } else { stdout };

        if err_msg.contains("authenticator") || err_msg.contains("feature not supported") || err_msg.contains("enrollment failed") {
            return Err(format!(
                "Passkey creation requires physical touch on your hardware token (YubiKey or Touch ID). Please plug in your YubiKey or touch the sensor. Details: {}",
                err_msg
            ));
        }

        return Err(format!("Passkey generation failed: {}", err_msg));
    }

    // Read generated public key
    let pub_content = fs::read_to_string(&target_pub_path)
        .map_err(|e| format!("Could not read generated public key: {}", e))?;
    let pub_trimmed = pub_content.trim().to_string();

    let fp = get_fingerprint(&target_pub_path)
        .unwrap_or_else(|| "SHA256:FIDO2-PASSKEY".to_string());

    let formatted_type = if ktype == "ed25519-sk" {
        "FIDO2 (Ed25519-SK)".to_string()
    } else {
        "FIDO2 (ECDSA-SK)".to_string()
    };

    // Also mirror to Theia Key Vault for easy 1-click management
    if let Some(vault_dir) = crate::vault::get_vault_dir() {
        let _ = fs::create_dir_all(&vault_dir);
        let _ = fs::copy(&target_priv_path, vault_dir.join(clean_name));
        let _ = fs::copy(&target_pub_path, vault_dir.join(format!("{}.pub", clean_name)));
    }

    Ok(KeyPairInfo {
        name: clean_name.to_string(),
        key_type: formatted_type,
        public_key: pub_trimmed,
        fingerprint: fp,
        path: target_priv_path.to_string_lossy().to_string(),
    })
}

/// Downloads resident keys from a connected YubiKey or Mac Touch ID into ~/.ssh/ and Key Vault
pub fn download_resident_keys() -> Result<Vec<KeyPairInfo>, String> {
    let home = dirs::home_dir().ok_or("Could not resolve home directory")?;
    let ssh_dir = home.join(".ssh");
    fs::create_dir_all(&ssh_dir).map_err(|e| e.to_string())?;

    let keygen_bin = resolve_ssh_tool("ssh-keygen");
    let output = Command::new(&keygen_bin)
        .arg("-K")
        .current_dir(&ssh_dir)
        .stdin(std::process::Stdio::null())
        .output()
        .map_err(|e| format!("Failed to download resident keys: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if stderr.contains("No resident keys") || stderr.contains("not supported") {
            return Err("No resident keys found on the connected security key / Touch ID.".to_string());
        }
        return Err(format!("Failed to retrieve resident keys: {}", stderr));
    }

    // Scan ~/.ssh for any newly downloaded *_sk keys
    let mut imported = Vec::new();
    if let Ok(entries) = fs::read_dir(&ssh_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                if (name.contains("id_ed25519_sk") || name.contains("id_ecdsa_sk")) && !name.ends_with(".pub") {
                    let pub_path = path.with_extension("pub");
                    if pub_path.exists() {
                        if let Ok(content) = fs::read_to_string(&pub_path) {
                            let fp = get_fingerprint(&pub_path).unwrap_or_default();
                            imported.push(KeyPairInfo {
                                name: name.to_string(),
                                key_type: if name.contains("ed25519") { "FIDO2 (Ed25519-SK)".to_string() } else { "FIDO2 (ECDSA-SK)".to_string() },
                                public_key: content.trim().to_string(),
                                fingerprint: fp,
                                path: path.to_string_lossy().to_string(),
                            });
                        }
                    }
                }
            }
        }
    }

    Ok(imported)
}

fn get_fingerprint(pub_key_path: &Path) -> Option<String> {
    let keygen_bin = resolve_ssh_tool("ssh-keygen");
    let output = Command::new(&keygen_bin)
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
