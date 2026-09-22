use crate::error::{AppError, Result};
use crate::terminal::{get_terminal_size, TerminalGuard};
use bytes::Bytes;
use russh::client::Msg;
use russh::{Channel, ChannelMsg};
use std::io::ErrorKind;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::signal::unix::{signal, SignalKind};

pub async fn run_interactive_session(
    mut channel: Channel<Msg>,
) -> Result<u32> {
    // Acquire RAII TerminalGuard: enters raw mode and ensures cleanup on drop/panic
    let _guard = TerminalGuard::enter()
        .map_err(|e| AppError::Terminal(format!("Failed to enable raw mode: {e}")))?;

    let mut stdin = tokio::io::stdin();
    let mut stdout = tokio::io::stdout();

    let mut sigwinch = signal(SignalKind::window_change())
        .map_err(|e| AppError::Terminal(format!("Failed to bind SIGWINCH handler: {e}")))?;

    let mut stdin_buf = [0u8; 8192];
    let mut exit_code: u32 = 0;

    loop {
        tokio::select! {
            // Forward local user keystrokes to the remote SSH channel
            read_result = stdin.read(&mut stdin_buf) => {
                match read_result {
                    Ok(0) => {
                        // EOF on stdin (e.g. piped input or end of stream)
                        let _ = channel.eof().await;
                        break;
                    }
                    Ok(n) => {
                        let chunk = Bytes::copy_from_slice(&stdin_buf[..n]);
                        if channel.data_bytes(chunk).await.is_err() {
                            break;
                        }
                    }
                    Err(e) => {
                        if e.kind() != ErrorKind::Interrupted {
                            break;
                        }
                    }
                }
            }

            // Receive output from the remote SSH channel and flush to local stdout
            maybe_msg = channel.wait() => {
                match maybe_msg {
                    Some(ChannelMsg::Data { ref data }) => {
                        if stdout.write_all(data).await.is_err() || stdout.flush().await.is_err() {
                            break;
                        }
                    }
                    Some(ChannelMsg::ExtendedData { ref data, .. }) => {
                        if stdout.write_all(data).await.is_err() || stdout.flush().await.is_err() {
                            break;
                        }
                    }
                    Some(ChannelMsg::ExitStatus { exit_status }) => {
                        exit_code = exit_status;
                    }
                    Some(ChannelMsg::Eof) => {
                        // Remote server sent EOF
                    }
                    Some(ChannelMsg::Close) | None => {
                        break;
                    }
                    _ => {}
                }
            }

            // Terminal resize event: propagate new dimensions immediately to remote PTY
            _ = sigwinch.recv() => {
                let (cols, rows) = get_terminal_size();
                let _ = channel.window_change(cols as u32, rows as u32, 0, 0).await;
            }
        }
    }

    Ok(exit_code)
}
