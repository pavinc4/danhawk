use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use once_cell::sync::Lazy;

use crate::core::{error::DanhawkError, logger, paths};
use crate::engines;

// ── Manifest ──────────────────────────────────────────────────────────────────

#[derive(Deserialize, Clone)]
struct Manifest {
    id: String,
    name: String,
    version: String,
    author: String,
    description: String,
    engine: String,
    entry: String,
    #[serde(default)] category:    String,
    #[serde(default)] icon:        String,
    #[serde(default)] icon_color:  String,
    #[serde(default)] icon_bg:     String,
    #[serde(default)] targets:     Vec<String>,
    #[serde(default)] details:     String,
    #[serde(default)] source_code: String,
    #[serde(default)] changelog:   Vec<ChangelogEntry>,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct ChangelogEntry {
    pub version: String,
    pub date:    String,
    pub changes: Vec<String>,
}

// ── ModInfo sent to frontend ──────────────────────────────────────────────────

#[derive(Serialize, Clone)]
pub struct ModInfo {
    pub id:          String,
    pub name:        String,
    pub slug:        String,
    pub version:     String,
    pub author:      String,
    pub targets:     Vec<String>,
    pub description: String,
    pub category:    String,
    pub icon:        String,
    pub icon_color:  String,
    pub icon_bg:     String,
    pub mod_type:    String,
    pub removable:   bool,
    pub editable:    bool,
    pub installed:   bool,
    pub enabled:     bool,
    pub source_code: String,
    pub details:     String,
    pub changelog:   Vec<ChangelogEntry>,
    #[serde(skip)] pub entry_path: PathBuf,
    #[serde(skip)] pub engine:     String,
}

// ── Persisted state ───────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Default, Clone)]
struct ModState {
    installed: bool,
    enabled:   bool,
}

#[derive(Serialize, Deserialize, Default)]
struct PersistedState {
    mods: HashMap<String, ModState>,
}

fn load_state() -> PersistedState {
    let path = paths::state_file();
    fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_state(reg: &Registry) {
    let mut ps = PersistedState::default();
    for (id, m) in &reg.mods {
        ps.mods.insert(id.clone(), ModState {
            installed: m.installed,
            enabled:   m.enabled,
        });
    }
    if let Ok(json) = serde_json::to_string_pretty(&ps) {
        let _ = fs::write(paths::state_file(), json);
    }
}

// ── In-memory registry ────────────────────────────────────────────────────────

struct Registry {
    mods: HashMap<String, ModInfo>,
}

static REGISTRY: Lazy<Mutex<Registry>> =
    Lazy::new(|| Mutex::new(Registry { mods: HashMap::new() }));

// ── Manifest discovery ────────────────────────────────────────────────────────

fn discover_mods() -> Vec<ModInfo> {
    let repo = paths::extensions_dir();
    logger::info(&format!("[mods] scanning: {}", repo.display()));

    let entries = match fs::read_dir(&repo) {
        Ok(e) => e,
        Err(e) => {
            logger::warn(&format!("[mods] cannot read dir: {}", e));
            return vec![];
        }
    };

    let mut result = Vec::new();
    for entry in entries.flatten() {
        let dir = entry.path();
        if !dir.is_dir() { continue; }

        let manifest_path = dir.join("manifest.json");
        if !manifest_path.exists() { continue; }

        let raw = match fs::read_to_string(&manifest_path) {
            Ok(s) => s,
            Err(e) => {
                logger::warn(&format!("[mods] read error {}: {}", manifest_path.display(), e));
                continue;
            }
        };

        let manifest: Manifest = match serde_json::from_str(&raw) {
            Ok(m) => m,
            Err(e) => {
                logger::warn(&format!("[mods] parse error {}: {}", manifest_path.display(), e));
                continue;
            }
        };

        logger::info(&format!("[mods] loaded: {} ({})", manifest.id, manifest.engine));
        let entry_path = dir.join(&manifest.entry);
        result.push(ModInfo {
            slug:        manifest.id.clone(),
            id:          manifest.id,
            name:        manifest.name,
            version:     manifest.version,
            author:      manifest.author,
            description: manifest.description,
            category:    manifest.category,
            icon:        manifest.icon,
            icon_color:  manifest.icon_color,
            icon_bg:     manifest.icon_bg,
            targets:     manifest.targets,
            details:     manifest.details,
            source_code: manifest.source_code,
            changelog:   manifest.changelog,
            mod_type:    "official".into(),
            removable:   false,
            editable:    false,
            installed:   false,
            enabled:     false,
            entry_path,
            engine:      manifest.engine,
        });
    }
    logger::info(&format!("[mods] found {} mods", result.len()));
    result.sort_by(|a, b| a.name.cmp(&b.name));
    result
}

// ── Startup ───────────────────────────────────────────────────────────────────

fn kill_orphans() {
    use std::fs;
    use crate::core::paths;

    let pids_dir = paths::pids_dir();
    let entries = match fs::read_dir(&pids_dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    let mut killed = 0u32;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("pid") { continue; }

        if let Ok(contents) = fs::read_to_string(&path) {
            if let Ok(pid) = contents.trim().parse::<u32>() {
                logger::info(&format!("[startup] killing crash-survivor PID {}", pid));
                #[cfg(windows)]
                {
                    use std::os::windows::process::CommandExt;
                    let _ = std::process::Command::new("taskkill")
                        .args(["/F", "/T", "/PID", &pid.to_string()])
                        .creation_flags(0x08000000)
                        .output();
                    killed += 1;
                }
            }
        }
        let _ = fs::remove_file(&path);
    }

    if killed > 0 {
        std::thread::sleep(std::time::Duration::from_millis(400));
        logger::info(&format!("[startup] killed {} crash-survivor(s)", killed));
    }
}

pub fn restore_on_startup() {
    // Populate registry FIRST so get_mods() works immediately
    let mut mods  = discover_mods();
    let state     = load_state();

    for m in &mut mods {
        if let Some(s) = state.mods.get(&m.id) {
            m.installed = s.installed;
            m.enabled   = s.enabled;
        }
    }

    {
        let mut reg = REGISTRY.lock().unwrap();
        reg.mods.clear();
        for m in &mods {
            reg.mods.insert(m.id.clone(), m.clone());
        }
    }

    logger::info(&format!("[startup] registry ready: {} mods", mods.len()));

    // Kill orphans after registry is populated
    kill_orphans();

    // Re-launch active extensions
    for m in &mods {
        if m.enabled {
            logger::info(&format!("[startup] restoring: {}", m.id));
            if let Err(e) = engines::start(&m.engine, &m.id, &m.entry_path) {
                logger::error(&format!("[startup] failed to restore {}: {}", m.id, e));
                let mut reg = REGISTRY.lock().unwrap();
                if let Some(rm) = reg.mods.get_mut(&m.id) {
                    rm.enabled = false;
                }
                let reg = REGISTRY.lock().unwrap();
                save_state(&reg);
            }
        }
    }
}

// ── Tauri commands ────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_mods() -> Vec<ModInfo> {
    let reg = REGISTRY.lock().unwrap();

    if reg.mods.is_empty() {
        drop(reg);
        let mut mods = discover_mods();
        let state = load_state();
        for m in &mut mods {
            if let Some(s) = state.mods.get(&m.id) {
                m.installed = s.installed;
                m.enabled   = s.enabled;
            }
        }
        let mut reg = REGISTRY.lock().unwrap();
        for m in &mods {
            reg.mods.insert(m.id.clone(), m.clone());
        }
        let mut result: Vec<ModInfo> = reg.mods.values().cloned().collect();
        result.sort_by(|a, b| a.name.cmp(&b.name));
        return result;
    }

    let mut mods: Vec<ModInfo> = reg.mods.values().cloned().collect();
    mods.sort_by(|a, b| a.name.cmp(&b.name));
    mods
}

#[tauri::command]
pub fn install_mod(mod_id: String) -> Result<bool, String> {
    let mut reg = REGISTRY.lock().unwrap();
    match reg.mods.get_mut(&mod_id) {
        Some(m) => {
            m.installed = true;
            logger::info(&format!("[mods] installed: {}", mod_id));
            save_state(&reg);
            Ok(true)
        }
        None => Err(DanhawkError::NotFound(mod_id).into()),
    }
}

#[tauri::command]
pub fn remove_mod(mod_id: String) -> Result<bool, String> {
    let _ = toggle_mod(mod_id.clone(), false);
    let mut reg = REGISTRY.lock().unwrap();
    if let Some(m) = reg.mods.get_mut(&mod_id) {
        m.installed = false;
        m.enabled   = false;
        logger::info(&format!("[mods] removed: {}", mod_id));
        save_state(&reg);
    }
    Ok(true)
}

#[tauri::command]
pub fn toggle_mod(mod_id: String, enabled: bool) -> Result<bool, String> {
    let (entry_path, engine) = {
        let reg = REGISTRY.lock().unwrap();
        match reg.mods.get(&mod_id) {
            Some(m) => (m.entry_path.clone(), m.engine.clone()),
            None    => return Err(DanhawkError::NotFound(mod_id.clone()).into()),
        }
    };

    let result = if enabled {
        logger::info(&format!("[mods] enabling: {} via {}", mod_id, engine));
        engines::start(&engine, &mod_id, &entry_path)
    } else {
        logger::info(&format!("[mods] disabling: {}", mod_id));
        engines::stop(&engine, &mod_id)
    };

    match result {
        Ok(()) => {
            let mut reg = REGISTRY.lock().unwrap();
            if let Some(m) = reg.mods.get_mut(&mod_id) {
                m.enabled = enabled;
            }
            save_state(&reg);
            Ok(true)
        }
        Err(e) => {
            logger::error(&format!("[mods] toggle failed for {}: {}", mod_id, e));
            Err(e.into())
        }
    }
}

#[tauri::command]
pub fn get_debug_info() -> serde_json::Value {
    let ext_dir = paths::extensions_dir();
    let ext_exists = ext_dir.exists();
    let ext_str = ext_dir.to_string_lossy().to_string();
    let state_str = paths::state_file().to_string_lossy().to_string();
    let exe_str = std::env::current_exe().unwrap_or_default().to_string_lossy().to_string();
    let cwd_str = std::env::current_dir().unwrap_or_default().to_string_lossy().to_string();
    let mods_count = REGISTRY.lock().unwrap().mods.len();
    serde_json::json!({
        "extensions_dir": ext_str,
        "extensions_dir_exists": ext_exists,
        "state_file": state_str,
        "exe": exe_str,
        "cwd": cwd_str,
        "mods_count": mods_count
    })
}