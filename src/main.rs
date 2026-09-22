mod config;
mod error;
mod ssh;
mod terminal;
mod tui;

use clap::Parser;
use config::{get_all_hosts, parse_target};
use std::path::PathBuf;
use std::process::ExitCode;

#[derive(Parser, Debug)]
#[command(
    name = "theia-ssh",
    author = "Theia Systems Craftsman",
    version = "0.1.0",
    about = "High-performance, memory-safe macOS SSH client and session manager in Rust",
    long_about = "A blazingly fast terminal SSH client and session manager for macOS.\nFeatures async I/O on Tokio, pure-Rust russh cryptographic engine, RAII terminal raw-mode safety, automatic window resize tracking, and an interactive Ratatui host selector."
)]
struct Cli {
    /// Target destination in format [user@]hostname[:port] or host alias from ~/.ssh/config
    #[arg(value_name = "DESTINATION")]
    destination: Option<String>,

    /// Remote port to connect to
    #[arg(short = 'p', long = "port", value_name = "PORT")]
    port: Option<u16>,

    /// User to log in as
    #[arg(short = 'l', long = "user", value_name = "USERNAME")]
    user: Option<String>,

    /// Identity file for public key authentication (private key)
    #[arg(short = 'i', long = "identity", value_name = "KEY_PATH")]
    identity: Option<PathBuf>,

    /// Force opening the interactive TUI session manager
    #[arg(short = 'm', long = "menu")]
    menu: bool,
}

#[tokio::main]
async fn main() -> ExitCode {
    let cli = Cli::parse();

    let target_host = if cli.menu || cli.destination.is_none() {
        // Launch interactive TUI session manager
        match tui::run_session_picker() {
            Ok(Some(host)) => host,
            Ok(None) => return ExitCode::SUCCESS, // User quit without selecting
            Err(e) => {
                eprintln!("\x1b[31mError launching TUI: {}\x1b[0m", e);
                return ExitCode::FAILURE;
            }
        }
    } else {
        // Direct CLI destination supplied
        let dest = cli.destination.unwrap();

        // Check if `dest` matches an existing ~/.ssh/config or bookmark alias
        let all_hosts = get_all_hosts();
        if let Some(existing) = all_hosts.into_iter().find(|h| h.name.eq_ignore_ascii_case(&dest)) {
            let mut host = existing;
            if let Some(p) = cli.port {
                host.port = p;
            }
            if let Some(u) = cli.user {
                host.user = Some(u);
            }
            if let Some(i) = cli.identity {
                host.identity_file = Some(i.to_string_lossy().to_string());
            }
            host
        } else {
            // Parse as [user@]hostname[:port]
            match parse_target(&dest) {
                Ok(mut host) => {
                    if let Some(p) = cli.port {
                        host.port = p;
                    }
                    if let Some(u) = cli.user {
                        host.user = Some(u);
                    }
                    if let Some(i) = cli.identity {
                        host.identity_file = Some(i.to_string_lossy().to_string());
                    }
                    host
                }
                Err(e) => {
                    eprintln!("\x1b[31mError: {}\x1b[0m", e);
                    return ExitCode::FAILURE;
                }
            }
        }
    };

    // Connect and run interactive SSH session
    match ssh::connect_and_run(&target_host).await {
        Ok(code) => {
            if code == 0 {
                ExitCode::SUCCESS
            } else {
                ExitCode::from(code as u8)
            }
        }
        Err(e) => {
            eprintln!("\x1b[1;31mConnection error:\x1b[0m {}", e);
            ExitCode::FAILURE
        }
    }
}
