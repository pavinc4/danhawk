use serde::{Deserialize, Serialize};
use crate::core::logger;

#[derive(Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub check_updates:       bool,
    pub developer_mode:      bool,
    pub start_with_windows:  bool,
    pub start_minimized:     bool,
    pub language:            String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            check_updates:      true,
            developer_mode:     true,
            start_with_windows: false,
            start_minimized:    false,
            language:           "English".into(),
        }
    }
}

#[tauri::command]
pub fn get_settings() -> AppSettings {
    AppSettings::default()
}

#[tauri::command]
pub fn save_settings(settings: AppSettings) -> Result<bool, String> {
    logger::info(&format!("[settings] saved — language: {}", settings.language));

    // Autostart is only ever written/removed when the user explicitly
    // toggles "Start with Windows" in Settings — never on app launch.
    #[cfg(windows)]
    {
        if settings.start_with_windows {
            register_autostart();
        } else {
            remove_autostart();
        }
    }

    Ok(true)
}

#[cfg(windows)]
fn register_autostart() {
    use std::os::windows::process::CommandExt;

    let exe = match std::env::current_exe() {
        Ok(p) => p,
        Err(e) => {
            logger::warn(&format!("[autostart] cannot get exe path: {}", e));
            return;
        }
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

#[cfg(windows)]
fn remove_autostart() {
    use std::os::windows::process::CommandExt;

    let result = std::process::Command::new("reg")
        .args([
            "delete",
            r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
            "/v", "Danhawk",
            "/f",
        ])
        .creation_flags(0x08000000)
        .output();

    match result {
        Ok(out) if out.status.success() =>
            logger::info("[autostart] removed"),
        Ok(_) => {} // key didn't exist — that's fine
        Err(e) =>
            logger::warn(&format!("[autostart] remove error: {}", e)),
    }
}