mod hosts;
mod keychain;
mod known_hosts;
mod local_pty;
mod models;
mod network;
mod session;
mod sftp;
mod snippets;
mod tray;
mod tunnel;
mod vault;

use hosts::{get_all_hosts, load_bookmarks, save_bookmarks};
use local_pty::LocalPtyManager;
use models::{HostConfig, KeyPairInfo, KnownHostEntry, RemoteFileEntry, ServerTelemetry, Snippet, TunnelConfig};
use session::SessionManager;
use sftp::SftpManager;
use snippets::{load_snippets, save_snippets};
use std::sync::Arc;
use tauri::{AppHandle, State};
use tokio::sync::Mutex;
use tunnel::{load_tunnels, save_tunnels, TunnelManager};
use vault::{generate_key_pair, list_keys};

struct AppState {
    session_mgr: SessionManager,
    tunnel_mgr: TunnelManager,
    sftp_sessions: Arc<Mutex<std::collections::HashMap<String, SftpManager>>>,
    local_pty_mgr: LocalPtyManager,
}

// ---------------------- Host Commands ----------------------
#[tauri::command]
fn get_hosts() -> Vec<HostConfig> {
    get_all_hosts()
}

#[tauri::command]
fn save_host(host: HostConfig) -> Result<(), String> {
    let mut bookmarks = load_bookmarks();
    if let Some(idx) = bookmarks.iter().position(|h| h.id == host.id) {
        bookmarks[idx] = host;
    } else {
        bookmarks.insert(0, host);
    }
    save_bookmarks(&bookmarks)
}

#[tauri::command]
fn delete_host(id: String) -> Result<(), String> {
    hosts::remove_or_hide_host(&id)
}

// ---------------------- SSH Terminal Commands ----------------------
#[tauri::command]
async fn ssh_connect(
    app: AppHandle,
    state: State<'_, AppState>,
    session_id: String,
    host: HostConfig,
    cols: u32,
    rows: u32,
) -> Result<(), String> {
    let sftp = state
        .session_mgr
        .connect(app, session_id.clone(), host, cols, rows)
        .await?;

    let mut map = state.sftp_sessions.lock().await;
    map.insert(session_id, sftp);
    Ok(())
}

#[tauri::command]
async fn local_terminal_spawn(
    app: AppHandle,
    state: State<'_, AppState>,
    session_id: String,
    cols: u32,
    rows: u32,
) -> Result<(), String> {
    state
        .local_pty_mgr
        .spawn(app, session_id, cols as u16, rows as u16)
        .await
}

#[tauri::command]
async fn ssh_send_data(
    state: State<'_, AppState>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    let bytes = data.as_bytes();
    if state.local_pty_mgr.write(&session_id, bytes).await.is_ok() {
        return Ok(());
    }
    state
        .session_mgr
        .send_input(&session_id, data.into_bytes())
        .await
}

#[tauri::command]
async fn ssh_resize(
    state: State<'_, AppState>,
    session_id: String,
    cols: u32,
    rows: u32,
) -> Result<(), String> {
    let _ = state
        .local_pty_mgr
        .resize(&session_id, cols as u16, rows as u16)
        .await;
    state.session_mgr.resize(&session_id, cols, rows).await
}

#[tauri::command]
async fn ssh_disconnect(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    state.local_pty_mgr.close(&session_id).await;
    state.session_mgr.close(&session_id).await;
    let mut map = state.sftp_sessions.lock().await;
    map.remove(&session_id);
    Ok(())
}

// ---------------------- Local Filesystem Fallbacks & SFTP Commands ----------------------
fn resolve_fs_path(path: &str) -> std::path::PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("/"));
    if path.is_empty() || path == "." || path == "~" {
        home
    } else if let Some(stripped) = path.strip_prefix("~/") {
        home.join(stripped)
    } else if let Some(stripped) = path.strip_prefix('~') {
        home.join(stripped)
    } else {
        std::path::PathBuf::from(path)
    }
}

fn local_list_dir(path: &str) -> Result<Vec<RemoteFileEntry>, String> {
    let p = resolve_fs_path(path);
    let read_dir = std::fs::read_dir(&p)
        .map_err(|e| format!("Could not read local directory {}: {}", p.display(), e))?;
    let mut entries = Vec::new();

    for item in read_dir.flatten() {
        let name = item.file_name().to_string_lossy().to_string();
        if name.starts_with('.') && name != ".env" && name != ".gitignore" && name != ".zshrc" {
            continue;
        }
        let md = match item.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        let is_dir = md.is_dir();
        let size = md.len();
        let modified = md
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0);
        let path_str = item.path().to_string_lossy().to_string();

        entries.push(RemoteFileEntry {
            name,
            path: path_str,
            is_dir,
            size,
            modified,
            permissions: 0o755,
        });
    }

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

fn local_read_file(path: &str) -> Result<String, String> {
    let p = resolve_fs_path(path);
    std::fs::read_to_string(&p).map_err(|e| format!("Failed to read {}: {}", p.display(), e))
}

fn local_write_file(path: &str, content: &str) -> Result<(), String> {
    let p = resolve_fs_path(path);
    if let Some(parent) = p.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    std::fs::write(&p, content).map_err(|e| format!("Failed to write {}: {}", p.display(), e))
}

fn local_write_binary(path: &str, data: &[u8]) -> Result<(), String> {
    let p = resolve_fs_path(path);
    if let Some(parent) = p.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    std::fs::write(&p, data).map_err(|e| format!("Failed to write {}: {}", p.display(), e))
}

fn local_mkdir(path: &str) -> Result<(), String> {
    let p = resolve_fs_path(path);
    std::fs::create_dir_all(&p).map_err(|e| format!("Failed to create directory {}: {}", p.display(), e))
}

fn local_delete(path: &str) -> Result<(), String> {
    let p = resolve_fs_path(path);
    if p.is_dir() {
        std::fs::remove_dir_all(&p).map_err(|e| format!("Failed to remove directory {}: {}", p.display(), e))
    } else {
        std::fs::remove_file(&p).map_err(|e| format!("Failed to remove file {}: {}", p.display(), e))
    }
}

fn local_rename(old_path: &str, new_path: &str) -> Result<(), String> {
    let old_p = resolve_fs_path(old_path);
    let new_p = resolve_fs_path(new_path);
    std::fs::rename(&old_p, &new_p).map_err(|e| format!("Failed to rename {} -> {}: {}", old_p.display(), new_p.display(), e))
}

#[tauri::command]
async fn sftp_list(
    state: State<'_, AppState>,
    session_id: String,
    path: String,
) -> Result<Vec<RemoteFileEntry>, String> {
    let map = state.sftp_sessions.lock().await;
    if let Some(sftp) = map.get(&session_id) {
        sftp.list_dir(&path).await
    } else {
        local_list_dir(&path)
    }
}

#[tauri::command]
async fn sftp_read(
    state: State<'_, AppState>,
    session_id: String,
    path: String,
) -> Result<String, String> {
    let map = state.sftp_sessions.lock().await;
    if let Some(sftp) = map.get(&session_id) {
        sftp.read_file(&path).await
    } else {
        local_read_file(&path)
    }
}

#[tauri::command]
async fn sftp_write(
    state: State<'_, AppState>,
    session_id: String,
    path: String,
    content: String,
) -> Result<(), String> {
    let map = state.sftp_sessions.lock().await;
    if let Some(sftp) = map.get(&session_id) {
        sftp.write_file(&path, &content).await
    } else {
        local_write_file(&path, &content)
    }
}

#[tauri::command]
async fn sftp_write_binary(
    state: State<'_, AppState>,
    session_id: String,
    path: String,
    data: Vec<u8>,
) -> Result<(), String> {
    let map = state.sftp_sessions.lock().await;
    if let Some(sftp) = map.get(&session_id) {
        sftp.write_binary(&path, &data).await
    } else {
        local_write_binary(&path, &data)
    }
}

#[tauri::command]
async fn sftp_mkdir(
    state: State<'_, AppState>,
    session_id: String,
    path: String,
) -> Result<(), String> {
    let map = state.sftp_sessions.lock().await;
    if let Some(sftp) = map.get(&session_id) {
        sftp.create_dir(&path).await
    } else {
        local_mkdir(&path)
    }
}

#[tauri::command]
async fn sftp_delete(
    state: State<'_, AppState>,
    session_id: String,
    path: String,
) -> Result<(), String> {
    let map = state.sftp_sessions.lock().await;
    if let Some(sftp) = map.get(&session_id) {
        sftp.delete_file(&path).await
    } else {
        local_delete(&path)
    }
}

#[tauri::command]
async fn sftp_rename(
    state: State<'_, AppState>,
    session_id: String,
    old_path: String,
    new_path: String,
) -> Result<(), String> {
    let map = state.sftp_sessions.lock().await;
    if let Some(sftp) = map.get(&session_id) {
        sftp.rename(&old_path, &new_path).await
    } else {
        local_rename(&old_path, &new_path)
    }
}

// ---------------------- Tunnel Commands ----------------------
#[tauri::command]
async fn list_tunnels(state: State<'_, AppState>) -> Result<Vec<TunnelConfig>, String> {
    let mut tunnels = load_tunnels();
    for t in &mut tunnels {
        let running = state.tunnel_mgr.is_running(&t.id).await;
        t.status = if running { "running".to_string() } else { "stopped".to_string() };
        t.bytes_transferred = state.tunnel_mgr.get_bytes(&t.id).await;
    }
    Ok(tunnels)
}

#[tauri::command]
async fn toggle_tunnel(state: State<'_, AppState>, tunnel_id: String) -> Result<bool, String> {
    let tunnels = load_tunnels();
    if let Some(tun) = tunnels.iter().find(|t| t.id == tunnel_id) {
        let running = state.tunnel_mgr.is_running(&tunnel_id).await;
        if running {
            state.tunnel_mgr.stop(&tunnel_id).await;
            Ok(false)
        } else {
            state.tunnel_mgr.start_mock_local(tun).await?;
            Ok(true)
        }
    } else {
        Err("Tunnel not found".to_string())
    }
}

#[tauri::command]
fn save_tunnel(tunnel: TunnelConfig) -> Result<(), String> {
    let mut tunnels = load_tunnels();
    if let Some(idx) = tunnels.iter().position(|t| t.id == tunnel.id) {
        tunnels[idx] = tunnel;
    } else {
        tunnels.push(tunnel);
    }
    save_tunnels(&tunnels)
}

#[tauri::command]
fn delete_tunnel(id: String) -> Result<(), String> {
    let mut tunnels = load_tunnels();
    tunnels.retain(|t| t.id != id);
    save_tunnels(&tunnels)
}

// ---------------------- Key Vault Commands ----------------------
#[tauri::command]
fn get_keys() -> Vec<KeyPairInfo> {
    list_keys()
}

#[tauri::command]
fn create_key(name: String, key_type: String) -> Result<KeyPairInfo, String> {
    generate_key_pair(&name, &key_type)
}

// ---------------------- Snippet Commands ----------------------
#[tauri::command]
fn get_snippets() -> Vec<Snippet> {
    load_snippets()
}

#[tauri::command]
fn save_snippet(snippet: Snippet) -> Result<(), String> {
    let mut snippets = load_snippets();
    if let Some(idx) = snippets.iter().position(|s| s.id == snippet.id) {
        snippets[idx] = snippet;
    } else {
        snippets.push(snippet);
    }
    save_snippets(&snippets)
}

#[tauri::command]
fn delete_snippet(id: String) -> Result<(), String> {
    let mut snippets = load_snippets();
    snippets.retain(|s| s.id != id);
    save_snippets(&snippets)
}

// ---------------------- Server Telemetry (HUD) ----------------------
#[tauri::command]
fn get_server_telemetry() -> ServerTelemetry {
    // Simulated realistic telemetry for HUD demo
    ServerTelemetry {
        cpu_usage: 14.8,
        mem_total: 16384,
        mem_used: 5412,
        disk_percent: 42.1,
        load_avg: "0.24, 0.38, 0.41".to_string(),
        uptime: "14 days, 6 hours".to_string(),
    }
}

// ---------------------- Keychain & Vibrancy Commands ----------------------
#[tauri::command]
fn keychain_save_secret(account: String, secret: String) -> Result<(), String> {
    keychain::store_secret(&account, &secret)
}

#[tauri::command]
fn keychain_get_secret(account: String) -> Result<Option<String>, String> {
    keychain::get_secret(&account)
}

#[tauri::command]
fn keychain_delete_secret(account: String) -> Result<(), String> {
    keychain::delete_secret(&account)
}

#[tauri::command]
fn set_window_vibrancy(window: tauri::WebviewWindow, enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        if enabled {
            let _ = window_vibrancy::apply_vibrancy(&window, window_vibrancy::NSVisualEffectMaterial::HudWindow, None, None);
        } else {
            let _ = window_vibrancy::clear_vibrancy(&window);
        }
    }
    Ok(())
}

// ---------------------- Known Hosts & Security Commands ----------------------
#[tauri::command]
fn get_known_hosts() -> Vec<KnownHostEntry> {
    known_hosts::get_known_hosts()
}

#[tauri::command]
fn remove_known_host(line_number: usize) -> Result<(), String> {
    known_hosts::remove_known_host(line_number)
}

// ---------------------- Native Notification & Dock Alert ----------------------
#[tauri::command]
fn send_native_notification(
    app: AppHandle,
    title: String,
    message: String,
    bounce_dock: bool,
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use tauri::Manager;
        if bounce_dock {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.request_user_attention(Some(tauri::UserAttentionType::Informational));
            }
        }

        let clean_title = title.replace('"', "\\\"");
        let clean_msg = message.replace('"', "\\\"");
        let script = format!(
            "display notification \"{}\" with title \"{}\" sound name \"Hero\"",
            clean_msg, clean_title
        );
        let _ = std::process::Command::new("osascript")
            .arg("-e")
            .arg(script)
            .spawn();
    }
    Ok(())
}

// ---------------------- Network Diagnostics Commands ----------------------
#[tauri::command]
async fn ping_host(host: String, port: u16) -> network::PingResult {
    network::ping_host(&host, port).await
}

#[tauri::command]
async fn probe_ports(host: String) -> Vec<network::PortProbeResult> {
    network::probe_ports(&host).await
}

// ---------------------- App Entrypoint ----------------------
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window_vibrancy::apply_vibrancy(&window, window_vibrancy::NSVisualEffectMaterial::HudWindow, None, None);
                }
            }
            if let Err(e) = tray::setup_tray(app.handle()) {
                log::error!("Failed to setup tray: {e}");
            }
            Ok(())
        })
        .manage(AppState {
            session_mgr: SessionManager::new(),
            tunnel_mgr: TunnelManager::new(),
            sftp_sessions: Arc::new(Mutex::new(std::collections::HashMap::new())),
            local_pty_mgr: LocalPtyManager::new(),
        })
        .invoke_handler(tauri::generate_handler![
            get_hosts,
            save_host,
            delete_host,
            ssh_connect,
            local_terminal_spawn,
            ssh_send_data,
            ssh_resize,
            ssh_disconnect,
            sftp_list,
            sftp_read,
            sftp_write,
            sftp_write_binary,
            sftp_mkdir,
            sftp_delete,
            sftp_rename,
            list_tunnels,
            toggle_tunnel,
            save_tunnel,
            delete_tunnel,
            get_keys,
            create_key,
            get_snippets,
            save_snippet,
            delete_snippet,
            get_server_telemetry,
            keychain_save_secret,
            keychain_get_secret,
            keychain_delete_secret,
            set_window_vibrancy,
            get_known_hosts,
            remove_known_host,
            send_native_notification,
            ping_host,
            probe_ports,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
