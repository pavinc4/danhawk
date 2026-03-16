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
    Ok(true)
}
