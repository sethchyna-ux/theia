use crate::models::RemoteFileEntry;
use russh_sftp::client::SftpSession;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct SftpManager {
    session: Arc<Mutex<Option<SftpSession>>>,
}

impl SftpManager {
    pub fn new(session: Option<SftpSession>) -> Self {
        Self {
            session: Arc::new(Mutex::new(session)),
        }
    }

    #[allow(dead_code)]
    pub fn set_session(&self, session: SftpSession) {
        let lock = self.session.clone();
        tokio::spawn(async move {
            let mut s = lock.lock().await;
            *s = Some(session);
        });
    }

    pub async fn list_dir(&self, path: &str) -> Result<Vec<RemoteFileEntry>, String> {
        let lock = self.session.lock().await;
        let sftp = lock.as_ref().ok_or("SFTP session not active")?;

        let canonical_path = if path.is_empty() || path == "." {
            sftp.canonicalize(".").await.map_err(|e| e.to_string())?
        } else {
            path.to_string()
        };

        let mut read_dir = sftp.read_dir(&canonical_path).await.map_err(|e| e.to_string())?;
        let mut entries = Vec::new();

        while let Some(item) = read_dir.next() {
            let name = item.file_name();
            if name == "." || name == ".." {
                continue;
            }

            let file_type = item.file_type();
            let is_dir = file_type.is_dir();
            let metadata = item.metadata();
            let size = metadata.len();
            let modified = metadata.mtime.unwrap_or(0) as u64;
            let permissions = metadata.permissions.unwrap_or(0);

            let full_path = if canonical_path.ends_with('/') {
                format!("{}{}", canonical_path, name)
            } else {
                format!("{}/{}", canonical_path, name)
            };

            entries.push(RemoteFileEntry {
                name,
                path: full_path,
                is_dir,
                size,
                modified,
                permissions,
            });
        }

        // Sort directories first, then alphabetical
        entries.sort_by(|a, b| {
            if a.is_dir == b.is_dir {
                a.name.to_lowercase().cmp(&b.name.to_lowercase())
            } else if a.is_dir {
                std::cmp::Ordering::Less
            } else {
                std::cmp::Ordering::Greater
            }
        });

        Ok(entries)
    }

    pub async fn read_file(&self, path: &str) -> Result<String, String> {
        let lock = self.session.lock().await;
        let sftp = lock.as_ref().ok_or("SFTP session not active")?;
        let bytes = sftp.read(path).await.map_err(|e| e.to_string())?;
        String::from_utf8(bytes).map_err(|_| "File is binary or not valid UTF-8".to_string())
    }

    pub async fn write_file(&self, path: &str, content: &str) -> Result<(), String> {
        let lock = self.session.lock().await;
        let sftp = lock.as_ref().ok_or("SFTP session not active")?;
        sftp.write(path, content.as_bytes()).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    pub async fn create_dir(&self, path: &str) -> Result<(), String> {
        let lock = self.session.lock().await;
        let sftp = lock.as_ref().ok_or("SFTP session not active")?;
        sftp.create_dir(path).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    pub async fn delete_file(&self, path: &str) -> Result<(), String> {
        let lock = self.session.lock().await;
        let sftp = lock.as_ref().ok_or("SFTP session not active")?;
        // Try remove file, if fail try remove dir
        if let Err(_) = sftp.remove_file(path).await {
            sftp.remove_dir(path).await.map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub async fn rename(&self, old_path: &str, new_path: &str) -> Result<(), String> {
        let lock = self.session.lock().await;
        let sftp = lock.as_ref().ok_or("SFTP session not active")?;
        sftp.rename(old_path, new_path).await.map_err(|e| e.to_string())?;
        Ok(())
    }
}
