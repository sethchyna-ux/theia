use crate::config::HostConfig;
use crate::error::{AppError, Result};
use crate::ssh::auth::authenticate;
use crate::ssh::bridge::run_interactive_session;
use crate::ssh::handler::TheiaClientHandler;
use crate::terminal::get_terminal_size;
use std::sync::Arc;
use std::time::Duration;

pub async fn connect_and_run(host: &HostConfig) -> Result<u32> {
    let username = if let Some(ref u) = host.user {
        u.clone()
    } else if let Ok(u) = std::env::var("USER") {
        u
    } else {
        "root".to_string()
    };

    let mut config = russh::client::Config::default();
    config.nodelay = true;
    config.keepalive_interval = Some(Duration::from_secs(30));

    let handler = TheiaClientHandler::new(host.hostname.clone(), host.port);

    eprintln!(
        "\x1b[1;36mConnecting to\x1b[0m \x1b[1m{}@{}:{}\x1b[0m ...",
        username, host.hostname, host.port
    );

    let connect_future = russh::client::connect(
        Arc::new(config),
        (host.hostname.as_str(), host.port),
        handler,
    );

    let mut session = tokio::time::timeout(Duration::from_secs(15), connect_future)
        .await
        .map_err(|_| AppError::Terminal("Connection timed out after 15 seconds".to_string()))?
        .map_err(|e| AppError::Ssh(e))?;

    // Perform multi-tier authentication
    authenticate(
        &mut session,
        &username,
        &host.hostname,
        host.identity_file.as_deref(),
    )
    .await?;

    eprintln!("\x1b[1;32mAuthentication successful. Allocating terminal...\x1b[0m");

    // Open an interactive session channel
    let channel = session
        .channel_open_session()
        .await
        .map_err(|e| AppError::Ssh(e))?;

    let (cols, rows) = get_terminal_size();

    // Request PTY with current terminal geometry
    channel
        .request_pty(
            true,
            "xterm-256color",
            cols as u32,
            rows as u32,
            0,
            0,
            &[],
        )
        .await
        .map_err(|e| AppError::Ssh(e))?;

    // Request remote login shell
    channel
        .request_shell(true)
        .await
        .map_err(|e| AppError::Ssh(e))?;

    // Run the non-blocking bidirectional bridge
    let exit_code = run_interactive_session(channel).await?;

    Ok(exit_code)
}
