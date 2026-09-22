mod hosts;
mod keychain;
mod local_pty;
mod models;
mod session;
mod sftp;
mod snippets;
mod tray;
mod tunnel;
mod vault;

use hosts::{get_all_hosts, load_bookmarks, save_bookmarks};
use local_pty::LocalPtyManager;
use models::{HostConfig, KeyPairInfo, RemoteFileEntry, ServerTelemetry, Snippet, TunnelConfig};
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
    let mut bookmarks = load_bookmarks();
    bookmarks.retain(|h| h.id != id);
    save_bookmarks(&bookmarks)
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

// ---------------------- SFTP Commands ----------------------
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
        Err("SFTP session not ready or not available for this host".to_string())
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
        Err("SFTP session not ready".to_string())
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
        Err("SFTP session not ready".to_string())
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
        Err("SFTP session not ready".to_string())
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
        Err("SFTP session not ready".to_string())
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
        Err("SFTP session not ready".to_string())
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
