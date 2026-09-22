use crate::error::{AppError, Result};
use russh::client::{AuthResult, Handle, Handler};
use russh::keys::agent::client::AgentClient;
use russh::keys::PrivateKeyWithHashAlg;
use std::path::{Path, PathBuf};
use std::sync::Arc;

pub async fn authenticate<H: Handler + Send + 'static>(
    session: &mut Handle<H>,
    user: &str,
    host: &str,
    custom_key_path: Option<&str>,
) -> Result<()> {
    // 1. Try SSH Agent first if $SSH_AUTH_SOCK is available
    if let Ok(mut agent) = AgentClient::connect_env().await {
        if let Ok(identities) = agent.request_identities().await {
            for identity in identities {
                let key = identity.public_key().into_owned();
                match session
                    .authenticate_publickey_with(user, key, None, &mut agent)
                    .await
                {
                    Ok(AuthResult::Success) => return Ok(()),
                    _ => continue,
                }
            }
        }
    }

    // 2. Try private key files
    let mut key_paths: Vec<PathBuf> = Vec::new();
    if let Some(custom) = custom_key_path {
        key_paths.push(PathBuf::from(custom));
    } else if let Some(home) = dirs::home_dir() {
        let ssh_dir = home.join(".ssh");
        key_paths.push(ssh_dir.join("id_ed25519"));
        key_paths.push(ssh_dir.join("id_rsa"));
        key_paths.push(ssh_dir.join("id_ecdsa"));
    }

    for key_path in key_paths {
        if !key_path.is_file() {
            continue;
        }

        if let Ok(()) = try_key_auth(session, user, &key_path).await {
            return Ok(());
        }
    }

    // 3. Fall back to interactive password authentication
    let prompt = format!("{user}@{host}'s password: ");
    match rpassword::prompt_password(prompt) {
        Ok(password) => {
            if password.is_empty() {
                return Err(AppError::AuthFailed("Empty password entered".to_string()));
            }

            match session.authenticate_password(user, password).await {
                Ok(AuthResult::Success) => Ok(()),
                Ok(AuthResult::Failure { remaining_methods, .. }) => {
                    Err(AppError::AuthFailed(format!(
                        "Permission denied (password). Remaining methods: {remaining_methods:?}"
                    )))
                }
                Err(e) => Err(AppError::Ssh(e)),
            }
        }
        Err(e) => Err(AppError::AuthFailed(format!("Password prompt failed: {e}"))),
    }
}

async fn try_key_auth<H: Handler + Send + 'static>(
    session: &mut Handle<H>,
    user: &str,
    path: &Path,
) -> Result<()> {
    // Try without password
    match russh::keys::load_secret_key(path, None) {
        Ok(key) => {
            let key_with_alg = PrivateKeyWithHashAlg::new(Arc::new(key), None);
            match session.authenticate_publickey(user, key_with_alg).await {
                Ok(AuthResult::Success) => return Ok(()),
                _ => return Err(AppError::AuthFailed("Key rejected".to_string())),
            }
        }
        Err(_) => {
            // Key might be passphrase protected
            let prompt = format!("Enter passphrase for key '{}': ", path.display());
            if let Ok(passphrase) = rpassword::prompt_password(prompt) {
                if let Ok(key) = russh::keys::load_secret_key(path, Some(&passphrase)) {
                    let key_with_alg = PrivateKeyWithHashAlg::new(Arc::new(key), None);
                    match session.authenticate_publickey(user, key_with_alg).await {
                        Ok(AuthResult::Success) => return Ok(()),
                        _ => return Err(AppError::AuthFailed("Passphrase key rejected".to_string())),
                    }
                }
            }
            Err(AppError::AuthFailed("Failed to decrypt key".to_string()))
        }
    }
}
