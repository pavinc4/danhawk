use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use once_cell::sync::Lazy;

use crate::core::{error::DanhawkError, logger, paths};
use crate::engines;

// ── base64 encoder (no external crate) ───────────────────────────────────────

fn base64_encode(input: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((input.len() + 2) / 3 * 4);
    for chunk in input.chunks(3) {
        let b0 = chunk[0] as usize;
        let b1 = if chunk.len() > 1 { chunk[1] as usize } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as usize } else { 0 };
        out.push(CHARS[(b0 >> 2)] as char);
        out.push(CHARS[((b0 & 3) << 4) | (b1 >> 4)] as char);
        out.push(if chunk.len() > 1 { CHARS[((b1 & 0xf) << 2) | (b2 >> 6)] as char } else { '=' });
        out.push(if chunk.len() > 2 { CHARS[b2 & 0x3f] as char } else { '=' });
    }
    out
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
// Optional block in manifest.json.
// Extensions that need more than spawn/kill declare what to run at each moment.
// Each field is a filename relative to the extension folder.
// Supports any file type the engines can run: .ps1 .bat .cmd .exe .ahk
//
// Example manifest.json usage:
//   "lifecycle": {
//       "on_enable":    "enable.ps1",
//       "on_disable":   "disable.ps1",
//       "on_install":   "install.ps1",
//       "on_uninstall": "uninstall.ps1"
//   }
//
// Rules:
//   - Entirely optional. Omit the block entirely for process-based extensions.
//   - If on_enable is set   → runs that file on toggle ON  (no process spawned/tracked)
//   - If on_disable is set  → runs that file on toggle OFF (kills any process first)
//   - If on_install is set  → runs that file when user clicks Install
//   - If on_uninstall is set → runs that file when user clicks Remove
//   - Mix and match — declare only the hooks you need

#[derive(Deserialize, Clone, Default)]
struct Lifecycle {
    #[serde(default)] on_enable:    Option<String>,
    #[serde(default)] on_disable:   Option<String>,
    #[serde(default)] on_install:   Option<String>,
    #[serde(default)] on_uninstall: Option<String>,
}

// ── Manifest ──────────────────────────────────────────────────────────────────

#[derive(Deserialize, Clone)]
struct Manifest {
    id:          String,
    name:        String,
    version:     String,
    author:      String,
    description: String,
    engine:      String,
    entry:       String,
    #[serde(default)] category:    String,
    #[serde(default)] icon:        String,
    #[serde(default)] icon_color:  String,
    #[serde(default)] icon_bg:     String,
    #[serde(default)] targets:     Vec<String>,
    #[serde(default)] details:     String,
    #[serde(default)] source_code: String,
    #[serde(default)] changelog:   Vec<ChangelogEntry>,
    #[serde(default)] lifecycle:   Lifecycle,
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
    pub icon_file:   String,
    pub mod_type:    String,
    pub removable:   bool,
    pub editable:    bool,
    pub installed:   bool,
    pub enabled:     bool,
    pub source_code: String,
    pub details:     String,
    pub changelog:   Vec<ChangelogEntry>,
    // Skipped from serialization — used internally only
    #[serde(skip)] pub entry_path:    PathBuf,
    #[serde(skip)] pub engine:        String,
    #[serde(skip)] pub on_enable:     Option<PathBuf>,
    #[serde(skip)] pub on_disable:    Option<PathBuf>,
    #[serde(skip)] pub on_install:    Option<PathBuf>,
    #[serde(skip)] pub on_uninstall:  Option<PathBuf>,
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
            Ok(s)  => s,
            Err(e) => {
                logger::warn(&format!("[mods] read error {}: {}", manifest_path.display(), e));
                continue;
            }
        };

        let manifest: Manifest = match serde_json::from_str(&raw) {
            Ok(m)  => m,
            Err(e) => {
                logger::warn(&format!("[mods] parse error {}: {}", manifest_path.display(), e));
                continue;
            }
        };

        logger::info(&format!("[mods] loaded: {} ({})", manifest.id, manifest.engine));

        // Resolve lifecycle hook paths relative to extension folder
        // None if the field was not declared in manifest
        let resolve = |name: &Option<String>| -> Option<PathBuf> {
            name.as_ref().map(|f| dir.join(f))
        };

        let on_enable    = resolve(&manifest.lifecycle.on_enable);
        let on_disable   = resolve(&manifest.lifecycle.on_disable);
        let on_install   = resolve(&manifest.lifecycle.on_install);
        let on_uninstall = resolve(&manifest.lifecycle.on_uninstall);

        // Log which hooks are declared for visibility
        if on_enable.is_some()    { logger::info(&format!("[mods] {} has on_enable hook",    manifest.id)); }
        if on_disable.is_some()   { logger::info(&format!("[mods] {} has on_disable hook",   manifest.id)); }
        if on_install.is_some()   { logger::info(&format!("[mods] {} has on_install hook",   manifest.id)); }
        if on_uninstall.is_some() { logger::info(&format!("[mods] {} has on_uninstall hook", manifest.id)); }

        let entry_path = dir.join(&manifest.entry);

        // Icon file — look for icon.png / .jpg / .ico / .svg / .webp in extension folder
        let icon_file = ["icon.png", "icon.jpg", "icon.jpeg", "icon.ico", "icon.svg", "icon.webp"]
            .iter()
            .find_map(|name| {
                let p = dir.join(name);
                if p.exists() { Some(p) } else { None }
            })
            .and_then(|p| {
                let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
                let mime = match ext.as_str() {
                    "png"        => "image/png",
                    "jpg"|"jpeg" => "image/jpeg",
                    "ico"        => "image/x-icon",
                    "svg"        => "image/svg+xml",
                    "webp"       => "image/webp",
                    _            => "image/png",
                };
                fs::read(&p).ok().map(|bytes| {
                    format!("data:{};base64,{}", mime, base64_encode(&bytes))
                })
            })
            .unwrap_or_default();

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
            icon_file,
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
            on_enable,
            on_disable,
            on_install,
            on_uninstall,
        });
    }

    logger::info(&format!("[mods] found {} mods", result.len()));
    result.sort_by(|a, b| a.name.cmp(&b.name));
    result
}

// ── Startup ───────────────────────────────────────────────────────────────────

fn kill_orphans() {
    let pids_dir = paths::pids_dir();
    let entries = match fs::read_dir(&pids_dir) {
        Ok(e)  => e,
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

    kill_orphans();

    // Re-enable extensions that were active last session
    for m in &mods {
        if m.enabled {
            logger::info(&format!("[startup] restoring: {}", m.id));
            if let Err(e) = engines::start(
                &m.engine,
                &m.id,
                &m.entry_path,
                m.on_enable.as_ref(),
            ) {
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
        let mut mods  = discover_mods();
        let state     = load_state();
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
    // Read hook path before locking registry for writing
    let on_install = {
        let reg = REGISTRY.lock().unwrap();
        reg.mods.get(&mod_id).and_then(|m| m.on_install.clone())
    };

    // Run on_install hook if declared
    if let Some(hook) = &on_install {
        if hook.exists() {
            logger::info(&format!("[lifecycle] on_install hook for '{}'", mod_id));
            if let Err(e) = engines::run_hook(hook) {
                logger::warn(&format!("[lifecycle] on_install hook failed for '{}': {}", mod_id, e));
            }
        }
    }

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
    // Disable first (runs on_disable hook if declared)
    let _ = toggle_mod(mod_id.clone(), false);

    // Read on_uninstall hook before locking registry for writing
    let on_uninstall = {
        let reg = REGISTRY.lock().unwrap();
        reg.mods.get(&mod_id).and_then(|m| m.on_uninstall.clone())
    };

    // Run on_uninstall hook if declared
    if let Some(hook) = &on_uninstall {
        if hook.exists() {
            logger::info(&format!("[lifecycle] on_uninstall hook for '{}'", mod_id));
            if let Err(e) = engines::run_hook(hook) {
                logger::warn(&format!("[lifecycle] on_uninstall hook failed for '{}': {}", mod_id, e));
            }
        }
    }

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
    let (entry_path, engine, on_enable, on_disable) = {
        let reg = REGISTRY.lock().unwrap();
        match reg.mods.get(&mod_id) {
            Some(m) => (
                m.entry_path.clone(),
                m.engine.clone(),
                m.on_enable.clone(),
                m.on_disable.clone(),
            ),
            None => return Err(DanhawkError::NotFound(mod_id.clone()).into()),
        }
    };

    let result = if enabled {
        logger::info(&format!("[mods] enabling: {} via {}", mod_id, engine));
        engines::start(&engine, &mod_id, &entry_path, on_enable.as_ref())
    } else {
        logger::info(&format!("[mods] disabling: {}", mod_id));
        engines::stop(&engine, &mod_id, on_disable.as_ref())
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