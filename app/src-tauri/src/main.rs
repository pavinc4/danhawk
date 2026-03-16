#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod core;
mod engines;

use core::logger;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, RunEvent, WindowEvent,
};

fn main() {
    logger::info("[danhawk] starting up");

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::mods_commands::get_mods,
            commands::mods_commands::install_mod,
            commands::mods_commands::remove_mod,
            commands::mods_commands::toggle_mod,
            commands::settings_commands::get_settings,
            commands::settings_commands::save_settings,
            commands::mods_commands::get_debug_info,
        ])
        .setup(|app| {
            // ── Tray icon + menu ───────────────────────────────────────────
            let show = MenuItem::with_id(app, "show", "Show Danhawk", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit",         true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Danhawk — running")
                .menu(&menu)
                // Left-click → show window
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event {
                        let app = tray.app_handle();
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                })
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                    "quit" => {
                        logger::info("[danhawk] quit — stopping all extensions");
                        engines::stop_all();
                        // Remove from Windows startup if desired — for now just exit
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            // ── Register in Windows startup (Run key) ──────────────────────
            #[cfg(windows)]
            register_autostart();

            // ── Init Job Object — must happen before any children spawn ───
            // Forces ALL child processes to die when DanHawk exits for any reason
            #[cfg(windows)]
            { let _ = &*engines::command::job::GLOBAL_JOB; }

            // ── Restore extensions that were active last session ──────────
            commands::mods_commands::restore_on_startup();

            // ── Production: start hidden to tray. Dev: show window. ──────
            #[cfg(not(debug_assertions))]
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.hide();
            }

            logger::info("[danhawk] ready — sitting in tray");
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error building danhawk")
        .run(|app, event| {
            // X button hides to tray — never quits
            if let RunEvent::WindowEvent {
                label,
                event: WindowEvent::CloseRequested { api, .. },
                ..
            } = event {
                if label == "main" {
                    api.prevent_close();
                    if let Some(win) = app.get_webview_window("main") {
                        let _ = win.hide();
                    }
                    logger::info("[danhawk] window hidden to tray");
                }
            }
        });
}

// ── Windows autostart via registry Run key ────────────────────────────────────

#[cfg(windows)]
fn register_autostart() {
    use std::os::windows::process::CommandExt;

    // Get path to current exe
    let exe = match std::env::current_exe() {
        Ok(p) => p,
        Err(e) => { logger::warn(&format!("[autostart] cannot get exe path: {}", e)); return; }
    };

    let exe_str = exe.to_string_lossy().to_string();

    // Write HKCU\Software\Microsoft\Windows\CurrentVersion\Run\Danhawk = "path\to\danhawk.exe"
    // Using reg.exe to avoid pulling in the full windows-sys crate just for this
    let result = std::process::Command::new("reg")
        .args([
            "add",
            r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
            "/v", "Danhawk",
            "/t", "REG_SZ",
            "/d", &exe_str,
            "/f",   // overwrite silently
        ])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .output();

    match result {
        Ok(out) if out.status.success() =>
            logger::info(&format!("[autostart] registered: {}", exe_str)),
        Ok(out) =>
            logger::warn(&format!("[autostart] reg failed: {}", String::from_utf8_lossy(&out.stderr))),
        Err(e) =>
            logger::warn(&format!("[autostart] reg error: {}", e)),
    }
}