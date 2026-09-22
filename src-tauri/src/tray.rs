use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager};

pub fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let hosts = crate::hosts::load_bookmarks();

    let open_item = MenuItem::with_id(app, "open", "Open Theia", true, None::<&str>)?;
    let term_item = MenuItem::with_id(app, "new_terminal", "New Local Terminal", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit Theia", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let sep2 = PredefinedMenuItem::separator(app)?;

    let connect_submenu = Submenu::new(app, "Quick Connect", true)?;
    if hosts.is_empty() {
        let no_hosts = MenuItem::with_id(app, "none", "No saved hosts", false, None::<&str>)?;
        connect_submenu.append(&no_hosts)?;
    } else {
        for host in hosts.iter().take(8) {
            let label = format!("{} ({}:{})", host.name, host.hostname, host.port);
            let id = format!("connect:{}", host.id);
            let item = MenuItem::with_id(app, id, label, true, None::<&str>)?;
            connect_submenu.append(&item)?;
        }
    }

    let menu = Menu::new(app)?;
    menu.append(&open_item)?;
    menu.append(&term_item)?;
    menu.append(&sep1)?;
    menu.append(&connect_submenu)?;
    menu.append(&sep2)?;
    menu.append(&quit_item)?;

    let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(move |app, event| {
            let id_str = event.id().as_ref();
            if id_str == "open" {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
            } else if id_str == "new_terminal" {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
                let _ = app.emit("tray-new-terminal", ());
            } else if id_str == "quit" {
                app.exit(0);
            } else if id_str.starts_with("connect:") {
                let host_id = id_str.trim_start_matches("connect:").to_string();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
                let _ = app.emit("tray-connect-host", host_id);
            }
        })
        .build(app)?;

    Ok(())
}
