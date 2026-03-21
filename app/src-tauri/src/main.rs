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

    ctrlc::set_handler(|| {
        logger::info("[danhawk] Ctrl+C — running shutdown hooks");
        commands::tools_commands::shutdown();
        std::process::exit(0);
    }).unwrap_or_else(|e| {
        logger::warn(&format!("[danhawk] failed to set Ctrl+C handler: {}", e));
    });

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::tools_commands::get_tools,
            commands::tools_commands::refresh_tools,
            commands::tools_commands::check_online,
            commands::tools_commands::clear_tools_cache,
            commands::tools_commands::install_tool,
            commands::tools_commands::remove_tool,
            commands::tools_commands::toggle_tool,
            commands::settings_commands::get_settings,
            commands::settings_commands::save_settings,
            commands::tool_commands::tool_read_file,
            commands::tool_commands::tool_write_file,
            commands::tool_commands::scan_apps,
            commands::tool_commands::load_icon,
        ])
        .setup(|app| {
            let show = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
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
                        logger::info("[danhawk] quit — stopping all tools");
                        commands::tools_commands::shutdown();
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            // Init Job Object before any children spawn
            #[cfg(windows)]
            { let _ = &*engines::job::GLOBAL_JOB; }

            // Restore tools that were active last session
            std::thread::spawn(|| {
                commands::tools_commands::restore_on_startup();
            });

            // Production: start hidden to tray. Dev: show window.
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
                RunEvent::ExitRequested { .. } => {
                    logger::info("[danhawk] exit requested — running shutdown hooks");
                    commands::tools_commands::shutdown();
                }
                _ => {}
            }
        });
}