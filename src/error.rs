use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug)]
#[allow(dead_code)]
pub enum AppError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("SSH protocol error: {0}")]
    Ssh(#[from] russh::Error),

    #[error("Terminal error: {0}")]
    Terminal(String),

    #[error("Authentication failed: {0}")]
    AuthFailed(String),

    #[error("Key format error: {0}")]
    KeyError(String),

    #[error("Failed to parse SSH target '{0}': format should be [user@]hostname[:port]")]
    InvalidTarget(String),

    #[error("Host key verification failed: {0}")]
    HostKeyRejected(String),

    #[error("SSH agent error: {0}")]
    Agent(String),

    #[error("Configuration error in '{path}': {message}")]
    Config {
        path: PathBuf,
        message: String,
    },

    #[error("Session terminated: {0}")]
    SessionTerminated(String),
}

pub type Result<T> = std::result::Result<T, AppError>;
