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

    // ── Ctrl+C / SIGINT handler ───────────────────────────────────────────────
    // Catches terminal kills (Ctrl+C in dev) and runs shutdown hooks before exit.
    // This is separate from the tray Quit button which calls shutdown() directly.
    ctrlc::set_handler(|| {
        logger::info("[danhawk] Ctrl+C — running shutdown hooks");
        commands::mods_commands::shutdown();
        std::process::exit(0);
    }).unwrap_or_else(|e| {
        logger::warn(&format!("[danhawk] failed to set Ctrl+C handler: {}", e));
    });

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::mods_commands::get_mods,
            commands::mods_commands::install_mod,
            commands::mods_commands::remove_mod,
            commands::mods_commands::toggle_mod,
            commands::settings_commands::get_settings,
            commands::settings_commands::save_settings,
            commands::extension_commands::ext_read_file,
            commands::extension_commands::ext_write_file,
            commands::extension_commands::scan_apps,
            commands::extension_commands::load_icon,
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
                        commands::mods_commands::shutdown();
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            // ── Register in Windows startup (Run key) ──────────────────────
            #[cfg(windows)]
            register_autostart();

            // ── Init Job Object — must happen before any children spawn ───
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
            match event {
                // X button hides to tray — never quits
                RunEvent::WindowEvent {
                    label,
                    event: WindowEvent::CloseRequested { api, .. },
                    ..
                } => {
                    if label == "main" {
                        api.prevent_close();
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.hide();
                        }
                        logger::info("[danhawk] window hidden to tray");
                    }
                }
                // Catch all other exit paths — taskkill, process manager, etc.
                RunEvent::ExitRequested { .. } => {
                    logger::info("[danhawk] exit requested — running shutdown hooks");
                    commands::mods_commands::shutdown();
                }
                _ => {}
            }
        });
}

// ── Windows autostart via registry Run key ────────────────────────────────────

#[cfg(windows)]
fn register_autostart() {
    use std::os::windows::process::CommandExt;

    let exe = match std::env::current_exe() {
        Ok(p) => p,
        Err(e) => { logger::warn(&format!("[autostart] cannot get exe path: {}", e)); return; }
    };

    let exe_str = exe.to_string_lossy().to_string();

    let result = std::process::Command::new("reg")
        .args([
            "add",
            r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
            "/v", "Danhawk",
            "/t", "REG_SZ",
            "/d", &exe_str,
            "/f",
        ])
        .creation_flags(0x08000000)
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