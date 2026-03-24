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
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

fn main() {
    logger::info("[danhawk] starting up");

    ctrlc::set_handler(|| {
        logger::info("[danhawk] Ctrl+C — running shutdown hooks");
        commands::tools_commands::shutdown();
        std::process::exit(0);
    }).unwrap_or_else(|e| {
        logger::warn(&format!("[danhawk] failed to set Ctrl+C handler: {}", e));
    });

    // Define the launcher shortcut: Ctrl+Win+Space
    let launcher_shortcut = Shortcut::new(
        Some(Modifiers::CONTROL | Modifiers::SUPER),
        Code::Space,
    );

    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::tools_commands::get_tools,
            commands::tools_commands::refresh_tools,
            commands::tools_commands::check_online,
            commands::tools_commands::clear_tools_cache,
            commands::tools_commands::install_tool,
            commands::tools_commands::remove_tool,
            commands::tools_commands::toggle_tool,
            commands::tools_commands::open_tool,
            commands::settings_commands::get_settings,
            commands::settings_commands::save_settings,
            commands::tool_commands::tool_read_file,
            commands::tool_commands::tool_write_file,
            commands::tool_commands::scan_apps,
            commands::tool_commands::load_icon,
        ])
        .setup(move |app| {
            let show = MenuItem::with_id(app, "show", "Show App", true, None::<&str>)?;
            let launcher = MenuItem::with_id(app, "launcher", "Open Launcher", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &launcher, &quit])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Danhawk")
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
                    "launcher" => {
                        toggle_launcher(app);
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

            // KILL ORPHANS FIRST! This clears stale hotkey registrations from the OS.
            logger::info("[startup] clearing orphan processes...");
            commands::tools_commands::kill_orphans();
            std::thread::sleep(std::time::Duration::from_millis(500)); // Give OS time to release handles

            // Register global shortcut: Ctrl+Win+Space → toggle launcher
            // Unregister all first — clears stale OS-level registrations from crashed instances
            let _ = app.global_shortcut().unregister_all();

            let app_handle = app.handle().clone();
            match app.global_shortcut().on_shortcut(
                launcher_shortcut,
                move |_app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        toggle_launcher(&app_handle);
                    }
                },
            ) {
                Ok(_) => logger::info("[danhawk] launcher shortcut registered: Ctrl+Win+Space"),
                Err(e) => logger::warn(&format!(
                    "[danhawk] failed to register launcher shortcut: {} — launcher hotkey won't work this session",
                    e
                )),
            }

            // Restore tools that were active last session (orphans already killed above)
            std::thread::spawn(|| {
                // Populate the in-memory registry from disk cache immediately
                let cached = commands::tools_commands::load_tools_cache();
                if !cached.is_empty() {
                    let mut reg = commands::tools_commands::REGISTRY.lock().unwrap();
                    for tool in cached {
                        reg.tools.insert(tool.id.clone(), tool);
                    }
                    logger::info("[startup] loaded tools from cache into registry");
                }
                
                // Then restore tools
                commands::tools_commands::restore_tools_only();
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
                    // Both windows just hide — never actually close
                    api.prevent_close();
                    if let Some(win) = app.get_webview_window(&label) {
                        let _ = win.hide();
                    }
                    if label == "main" {
                        logger::info("[danhawk] main window hidden to tray");
                    }
                }
                RunEvent::WindowEvent {
                    label,
                    event: WindowEvent::Focused(false),
                    ..
                } => {
                    // Launcher auto-hides when it loses focus
                    if label == "launcher" {
                        if let Some(win) = app.get_webview_window("launcher") {
                            let _ = win.hide();
                            logger::info("[danhawk] launcher hidden (focus lost)");
                        }
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

/// Toggle the launcher window: show if hidden, hide if visible.
fn toggle_launcher(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("launcher") {
        match win.is_visible() {
            Ok(true) => {
                let _ = win.hide();
                logger::info("[danhawk] launcher hidden");
            }
            _ => {
                // Center on the current monitor before showing
                let _ = win.center();
                let _ = win.show();
                let _ = win.set_focus();
                logger::info("[danhawk] launcher shown");
            }
        }
    }
}