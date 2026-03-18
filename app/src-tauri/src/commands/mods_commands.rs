use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::Read;
use std::path::PathBuf;
use std::sync::Mutex;
use once_cell::sync::Lazy;

use crate::core::{error::DanhawkError, logger, paths};
use crate::engines;

// ── GitHub source ─────────────────────────────────────────────────────────────

const GITHUB_OWNER:    &str = "pavinc4";
const GITHUB_REPO:     &str = "extensions-repo";
const GITHUB_BRANCH:   &str = "main";
const GITHUB_EXT_PATH: &str = "";

fn github_api_url(path: &str) -> String {
    if path.is_empty() {
        format!(
            "https://api.github.com/repos/{}/{}/contents?ref={}",
            GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH
        )
    } else {
        format!(
            "https://api.github.com/repos/{}/{}/contents/{}?ref={}",
            GITHUB_OWNER, GITHUB_REPO, path, GITHUB_BRANCH
        )
    }
}

fn github_raw_url(path: &str) -> String {
    format!(
        "https://raw.githubusercontent.com/{}/{}/{}/{}",
        GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, path
    )
}

// ── Extensions cache ─────────────────────────────────────────────────────────
// Saves fetched extensions to AppData/Local/Danhawk/extensions_cache.json.
// Loaded when offline so users see extensions without internet after first fetch.

fn cache_file() -> std::path::PathBuf {
    let dir = paths::appdata_dir();
    let _ = fs::create_dir_all(&dir);
    dir.join("extensions_cache.json")
}

fn save_extensions_cache(mods: &[ModInfo]) {
    // Serialize only the fields needed for display (skip internal #[serde(skip)] fields)
    if let Ok(json) = serde_json::to_string(mods) {
        let _ = fs::write(cache_file(), json);
        logger::info(&format!("[mods] cached {} extensions to disk", mods.len()));
    }
}

fn load_extensions_cache() -> Vec<ModInfo> {
    let raw = match fs::read_to_string(cache_file()) {
        Ok(s) => s,
        Err(_) => return vec![],
    };
    serde_json::from_str::<Vec<ModInfo>>(&raw).unwrap_or_default()
}

fn has_extensions_cache() -> bool {
    cache_file().exists()
}

fn fetch_text(url: &str) -> String {
    ureq::get(url)
        .set("User-Agent", "danhawk-app")
        .call()
        .ok()
        .and_then(|r| r.into_string().ok())
        .unwrap_or_default()
}

fn fetch_bytes(url: &str) -> Vec<u8> {
    let resp = match ureq::get(url).set("User-Agent", "danhawk-app").call() {
        Ok(r) => r,
        Err(_) => return vec![],
    };
    let mut buf = Vec::new();
    resp.into_reader().read_to_end(&mut buf).unwrap_or(0);
    buf
}

#[derive(Deserialize)]
struct GhEntry {
    name: String,
    #[serde(rename = "type")]
    entry_type: String,
}

// ── base64 encoder ────────────────────────────────────────────────────────────

fn base64_encode(input: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((input.len() + 2) / 3 * 4);
    for chunk in input.chunks(3) {
        let b0 = chunk[0] as usize;
        let b1 = if chunk.len() > 1 { chunk[1] as usize } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as usize } else { 0 };
        out.push(CHARS[b0 >> 2] as char);
        out.push(CHARS[((b0 & 3) << 4) | (b1 >> 4)] as char);
        out.push(if chunk.len() > 1 { CHARS[((b1 & 0xf) << 2) | (b2 >> 6)] as char } else { '=' });
        out.push(if chunk.len() > 2 { CHARS[b2 & 0x3f] as char } else { '=' });
    }
    out
}

// ── Download extension from GitHub ───────────────────────────────────────────
// Downloads all files in the extension folder to dst (AppData/extensions/<id>/)

fn download_extension_from_github(ext_id: &str, dst: &std::path::Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| format!("create dir {}: {}", dst.display(), e))?;

    let folder_path = if GITHUB_EXT_PATH.is_empty() { ext_id.to_string() } else { format!("{}/{}", GITHUB_EXT_PATH, ext_id) };
    let resp = ureq::get(&github_api_url(&folder_path))
        .set("User-Agent", "danhawk-app")
        .call()
        .map_err(|e| format!("GitHub API failed for '{}': {}", ext_id, e))?;

    let entries: Vec<GhEntry> = resp.into_json()
        .map_err(|e| format!("GitHub API parse failed for '{}': {}", ext_id, e))?;

    for entry in &entries {
        if entry.entry_type != "file" { continue; }
        let raw_url = github_raw_url(&format!("{}/{}", folder_path, entry.name));
        let file_resp = ureq::get(&raw_url)
            .set("User-Agent", "danhawk-app")
            .call()
            .map_err(|e| format!("fetch failed for '{}': {}", entry.name, e))?;

        let mut bytes = Vec::new();
        file_resp.into_reader().read_to_end(&mut bytes)
            .map_err(|e| format!("read failed for '{}': {}", entry.name, e))?;

        fs::write(dst.join(&entry.name), &bytes)
            .map_err(|e| format!("write failed for '{}': {}", entry.name, e))?;

        logger::info(&format!("[install] downloaded: {}/{}", ext_id, entry.name));
    }

    Ok(())
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

#[derive(Deserialize, Clone, Default)]
struct Lifecycle {
    #[serde(default)] on_enable:    Option<String>,
    #[serde(default)] on_disable:   Option<String>,
    #[serde(default)] on_install:   Option<String>,
    #[serde(default)] on_uninstall: Option<String>,
}

// ── UI slot types ─────────────────────────────────────────────────────────────

#[derive(Deserialize, Serialize, Clone, Default)]
struct DetailActionSlot {
    #[serde(rename = "type")] slot_type: String,
    label: String,
}

#[derive(Deserialize, Serialize, Clone, Default)]
struct DetailTabSlot {
    #[serde(rename = "type")] slot_type: String,
    label: String,
    id:    String,
}

#[derive(Deserialize, Serialize, Clone, Default)]
struct SidePanelSlot {
    #[serde(rename = "type")] slot_type: String,
}

#[derive(Deserialize, Serialize, Clone, Default)]
struct StatusBarSlot {
    #[serde(rename = "type")] slot_type: String,
    #[serde(default)] label: String,
}

#[derive(Deserialize, Serialize, Clone, Default)]
struct ModUISlots {
    #[serde(default)] detail_actions: Vec<DetailActionSlot>,
    #[serde(default)] detail_tabs:    Vec<DetailTabSlot>,
    #[serde(default)] side_panel:     Option<SidePanelSlot>,
    #[serde(default)] status_bar:     Option<StatusBarSlot>,
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
    #[serde(default)] category:      String,
    #[serde(default)] icon:          String,
    #[serde(default)] icon_color:    String,
    #[serde(default)] icon_bg:       String,
    #[serde(default)] targets:       Vec<String>,
    #[serde(default = "default_true")] source_visible: bool,
    #[serde(default)] lifecycle:     Lifecycle,
    #[serde(default)] ui:            ModUISlots,
}

fn default_true() -> bool { true }

// ── ModInfo sent to frontend ──────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone)]
pub struct ModInfo {
    pub id:             String,
    pub name:           String,
    pub slug:           String,
    pub version:        String,
    pub author:         String,
    pub targets:        Vec<String>,
    pub description:    String,
    pub category:       String,
    pub icon:           String,
    pub icon_color:     String,
    pub icon_bg:        String,
    pub icon_file:      String,
    pub mod_type:       String,
    pub removable:      bool,
    pub editable:       bool,
    pub installed:      bool,
    pub enabled:        bool,
    pub details_md:     String,
    pub changelog_md:   String,
    pub entry_source:   String,
    pub source_visible: bool,
    #[serde(skip)] pub entry_file:        String,
    #[serde(skip)] pub engine:            String,
    #[serde(skip)] pub on_enable_file:    Option<String>,
    #[serde(skip)] pub on_disable_file:   Option<String>,
    #[serde(skip)] pub on_install_file:   Option<String>,
    #[serde(skip)] pub on_uninstall_file: Option<String>,
    pub ui: Option<ModUISlots>,
}

impl ModInfo {
    pub fn runtime_dir(&self) -> PathBuf {
        paths::installed_ext_dir(&self.id)
    }
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
    fs::read_to_string(&path).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
}

fn save_state(reg: &Registry) {
    let mut ps = PersistedState::default();
    for (id, m) in &reg.mods {
        ps.mods.insert(id.clone(), ModState { installed: m.installed, enabled: m.enabled });
    }
    if let Ok(json) = serde_json::to_string_pretty(&ps) {
        let _ = fs::write(paths::state_file(), json);
    }
}

// ── In-memory registry ────────────────────────────────────────────────────────

struct Registry { mods: HashMap<String, ModInfo> }

static REGISTRY: Lazy<Mutex<Registry>> =
    Lazy::new(|| Mutex::new(Registry { mods: HashMap::new() }));

// ── GitHub fetch ──────────────────────────────────────────────────────────────
// Fetches all extension folders from GitHub concurrently.
// Each folder gets its own thread so they all fetch in parallel.

fn is_online() -> bool {
    // Quick check -- HEAD request to GitHub, 3 second timeout
    ureq::get("https://github.com")
        .set("User-Agent", "danhawk-app")
        .timeout(std::time::Duration::from_secs(3))
        .call()
        .is_ok()
}

fn fetch_from_github() -> Vec<ModInfo> {
    if !is_online() {
        logger::info("[mods] offline -- loading from cache");
        return load_extensions_cache();
    }

    logger::info("[mods] fetching extension list from GitHub");

    let api_url = github_api_url(GITHUB_EXT_PATH);
    let resp = match ureq::get(&api_url).set("User-Agent", "danhawk-app").call() {
        Ok(r) => r,
        Err(e) => { logger::warn(&format!("[mods] GitHub API failed: {}", e)); return vec![]; }
    };

    let entries: Vec<GhEntry> = match resp.into_json() {
        Ok(v) => v,
        Err(e) => { logger::warn(&format!("[mods] GitHub API parse failed: {}", e)); return vec![]; }
    };

    let folders: Vec<String> = entries.into_iter()
        .filter(|e| e.entry_type == "dir")
        .map(|e| e.name)
        .collect();

    logger::info(&format!("[mods] fetching {} folders concurrently", folders.len()));

    // Fetch all folders in parallel
    let handles: Vec<_> = folders.into_iter().map(|folder| {
        std::thread::spawn(move || {
            let folder_path = if GITHUB_EXT_PATH.is_empty() { folder.clone() } else { format!("{}/{}", GITHUB_EXT_PATH, folder) };
            let manifest_url = github_raw_url(&format!("{}/manifest.json", &folder_path));
            let raw = fetch_text(&manifest_url);
            if raw.is_empty() {
                logger::warn(&format!("[mods] no manifest for '{}'", folder));
                return None;
            }

            let manifest: Manifest = match serde_json::from_str(&raw) {
                Ok(m) => m,
                Err(e) => { logger::warn(&format!("[mods] bad manifest '{}': {}", folder, e)); return None; }
            };

            logger::info(&format!("[mods] loaded: {} ({})", manifest.id, manifest.engine));

            let details_md   = fetch_text(&github_raw_url(&format!("{}/details.md",   &folder_path)));
            let changelog_md = fetch_text(&github_raw_url(&format!("{}/changelog.md", &folder_path)));
            let entry_source = if manifest.source_visible {
                fetch_text(&github_raw_url(&format!("{}/{}", &folder_path, &manifest.entry)))
            } else { String::new() };

            let icon_file = ["icon.png","icon.jpg","icon.jpeg","icon.ico","icon.svg","icon.webp"]
                .iter()
                .find_map(|name| {
                    let bytes = fetch_bytes(&github_raw_url(&format!("{}/{}", &folder_path, name)));
                    if bytes.is_empty() { return None; }
                    let mime = match name.split('.').last().unwrap_or("") {
                        "png" => "image/png", "jpg"|"jpeg" => "image/jpeg",
                        "ico" => "image/x-icon", "svg" => "image/svg+xml",
                        "webp" => "image/webp", _ => "image/png",
                    };
                    Some(format!("data:{};base64,{}", mime, base64_encode(&bytes)))
                })
                .unwrap_or_default();

            let ui_empty = manifest.ui.detail_actions.is_empty()
                && manifest.ui.detail_tabs.is_empty()
                && manifest.ui.side_panel.is_none()
                && manifest.ui.status_bar.is_none();

            Some(ModInfo {
                slug:           manifest.id.clone(),
                id:             manifest.id,
                name:           manifest.name,
                version:        manifest.version,
                author:         manifest.author,
                description:    manifest.description,
                category:       manifest.category,
                icon:           manifest.icon,
                icon_color:     manifest.icon_color,
                icon_bg:        manifest.icon_bg,
                icon_file,
                targets:        manifest.targets,
                details_md,
                changelog_md,
                entry_source,
                source_visible: manifest.source_visible,
                mod_type:       "official".into(),
                removable:      false,
                editable:       false,
                installed:      false,
                enabled:        false,
                entry_file:     manifest.entry,
                engine:         manifest.engine,
                on_enable_file:    manifest.lifecycle.on_enable,
                on_disable_file:   manifest.lifecycle.on_disable,
                on_install_file:   manifest.lifecycle.on_install,
                on_uninstall_file: manifest.lifecycle.on_uninstall,
                ui: if ui_empty { None } else { Some(manifest.ui) },
            })
        })
    }).collect();

    let mut result: Vec<ModInfo> = handles.into_iter()
        .filter_map(|h| h.join().ok().flatten())
        .collect();

    result.sort_by(|a, b| a.name.cmp(&b.name));
    logger::info(&format!("[mods] fetched {} extensions from GitHub", result.len()));
    // Save to cache so app works offline on next launch
    save_extensions_cache(&result);
    result
}

// ── Startup ───────────────────────────────────────────────────────────────────
// No network calls here. Only reads installed manifests from AppData.
// Extensions are fetched from GitHub lazily when user opens Explore.

fn kill_orphans() {
    let entries = match fs::read_dir(paths::pids_dir()) { Ok(e) => e, Err(_) => return };
    let mut killed = 0u32;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("pid") { continue; }
        if let Ok(s) = fs::read_to_string(&path) {
            if let Ok(pid) = s.trim().parse::<u32>() {
                logger::info(&format!("[startup] killing crash-survivor PID {}", pid));
                #[cfg(windows)] {
                    use std::os::windows::process::CommandExt;
                    let _ = std::process::Command::new("taskkill")
                        .args(["/F", "/T", "/PID", &pid.to_string()])
                        .creation_flags(0x08000000).output();
                    killed += 1;
                }
            }
        }
        let _ = fs::remove_file(&path);
    }
    if killed > 0 {
        std::thread::sleep(std::time::Duration::from_millis(400));
        logger::info(&format!("[startup] killed {} crash-survivors", killed));
    }
}

pub fn restore_on_startup() {
    kill_orphans();

    let state = load_state();

    // Re-enable extensions from their installed AppData folder.
    // Reads only local installed manifests -- zero network calls.
    for (id, s) in &state.mods {
        if !s.enabled { continue; }

        let installed_dir = paths::installed_ext_dir(id);
        if !installed_dir.exists() {
            logger::warn(&format!("[startup] installed dir missing for '{}', skipping", id));
            continue;
        }

        let raw = match fs::read_to_string(installed_dir.join("manifest.json")) {
            Ok(s) => s,
            Err(_) => { logger::warn(&format!("[startup] no manifest for '{}', skipping", id)); continue; }
        };

        let manifest: Manifest = match serde_json::from_str(&raw) {
            Ok(m) => m,
            Err(_) => { logger::warn(&format!("[startup] bad manifest for '{}', skipping", id)); continue; }
        };

        let on_disable: Option<PathBuf> = manifest.lifecycle.on_disable.as_ref().map(|f| installed_dir.join(f));
        let on_enable:  Option<PathBuf> = manifest.lifecycle.on_enable.as_ref().map(|f| installed_dir.join(f));
        let entry = installed_dir.join(&manifest.entry);

        // Cleanup leftover state from crash
        if let Some(ref hook) = on_disable {
            if hook.exists() {
                logger::info(&format!("[startup] cleanup on_disable for '{}'", id));
                if let Err(e) = engines::run_hook(hook) {
                    logger::warn(&format!("[startup] cleanup failed '{}': {}", id, e));
                }
            }
        }

        logger::info(&format!("[startup] restoring: {}", id));
        if let Err(e) = engines::start(&manifest.engine, id, &entry, on_enable.as_ref()) {
            logger::error(&format!("[startup] failed to restore {}: {}", id, e));
        }
    }

    logger::info("[startup] done -- window ready");
}

// ── Tauri commands ────────────────────────────────────────────────────────────

// get_mods -- returns whatever is in the registry.
// On first call (registry empty) returns empty list.
// Registry is populated by refresh_mods when user opens Explore.
// Installed/enabled state is always read from state.json.
#[tauri::command]
pub fn get_mods() -> Vec<ModInfo> {
    let reg = REGISTRY.lock().unwrap();
    let state = load_state();
    let mut r: Vec<ModInfo> = reg.mods.values().cloned().map(|mut m| {
        if let Some(s) = state.mods.get(&m.id) {
            m.installed = s.installed;
            m.enabled   = s.enabled;
        }
        m
    }).collect();
    r.sort_by(|a, b| a.name.cmp(&b.name));
    r
}

// check_online -- fast connectivity check, called before refresh
#[tauri::command]
pub fn check_online() -> bool {
    is_online()
}

// clear_extensions_cache -- deletes the local cache file.
// Use for testing to force a fresh fetch from GitHub.
#[tauri::command]
pub fn clear_extensions_cache() -> bool {
    let path = cache_file();
    if path.exists() {
        let _ = fs::remove_file(&path);
        // Also clear registry so get_mods returns empty
        let mut reg = REGISTRY.lock().unwrap();
        reg.mods.clear();
        logger::info("[mods] extensions cache cleared");
        return true;
    }
    false
}

// refresh_mods -- called from Explore page on mount.
// Fetches from GitHub, updates registry, returns fresh list.
// This is the ONLY place GitHub is contacted.
#[tauri::command]
pub async fn refresh_mods() -> Vec<ModInfo> {
    tauri::async_runtime::spawn_blocking(|| {
        let mut mods = fetch_from_github();
        let state = load_state();
        for m in &mut mods {
            if let Some(s) = state.mods.get(&m.id) {
                m.installed = s.installed;
                m.enabled   = s.enabled;
            }
        }
        let mut reg = REGISTRY.lock().unwrap();
        reg.mods.clear();
        for m in &mods { reg.mods.insert(m.id.clone(), m.clone()); }
        let mut r: Vec<ModInfo> = reg.mods.values().cloned().collect();
        r.sort_by(|a, b| a.name.cmp(&b.name));
        r
    })
    .await
    .unwrap_or_default()
}

#[tauri::command]
pub fn install_mod(mod_id: String) -> Result<bool, String> {
    let on_install_file = {
        let reg = REGISTRY.lock().unwrap();
        match reg.mods.get(&mod_id) {
            Some(m) => m.on_install_file.clone(),
            None    => return Err(DanhawkError::NotFound(mod_id).into()),
        }
    };

    let installed_dir = paths::installed_ext_dir(&mod_id);

    logger::info(&format!("[install] downloading '{}' from GitHub", mod_id));
    download_extension_from_github(&mod_id, &installed_dir)
        .map_err(|e| format!("install failed for '{}': {}", mod_id, e))?;
    logger::info(&format!("[install] '{}' downloaded successfully", mod_id));

    if let Some(fname) = on_install_file {
        let hook = installed_dir.join(&fname);
        if hook.exists() {
            logger::info(&format!("[lifecycle] on_install for '{}'", mod_id));
            if let Err(e) = engines::run_hook(&hook) {
                logger::warn(&format!("[lifecycle] on_install failed '{}': {}", mod_id, e));
            }
        }
    }

    let mut reg = REGISTRY.lock().unwrap();
    match reg.mods.get_mut(&mod_id) {
        Some(m) => { m.installed = true; logger::info(&format!("[mods] installed: {}", mod_id)); save_state(&reg); Ok(true) }
        None    => Err(DanhawkError::NotFound(mod_id).into()),
    }
}

#[tauri::command]
pub fn remove_mod(mod_id: String) -> Result<bool, String> {
    let _ = toggle_mod(mod_id.clone(), false);

    let on_uninstall_file = {
        let reg = REGISTRY.lock().unwrap();
        reg.mods.get(&mod_id).and_then(|m| m.on_uninstall_file.clone())
    };

    let installed_dir = paths::installed_ext_dir(&mod_id);

    if let Some(fname) = on_uninstall_file {
        let hook = installed_dir.join(&fname);
        if hook.exists() {
            logger::info(&format!("[lifecycle] on_uninstall for '{}'", mod_id));
            if let Err(e) = engines::run_hook(&hook) {
                logger::warn(&format!("[lifecycle] on_uninstall failed '{}': {}", mod_id, e));
            }
        }
    }

    if installed_dir.exists() {
        match fs::remove_dir_all(&installed_dir) {
            Ok(_)  => logger::info(&format!("[uninstall] deleted AppData folder for '{}'", mod_id)),
            Err(e) => logger::warn(&format!("[uninstall] delete failed for '{}': {}", mod_id, e)),
        }
    }

    let mut reg = REGISTRY.lock().unwrap();
    if let Some(m) = reg.mods.get_mut(&mod_id) {
        m.installed = false; m.enabled = false;
        logger::info(&format!("[mods] uninstalled: {}", mod_id));
        save_state(&reg);
    }
    Ok(true)
}

#[tauri::command]
pub fn toggle_mod(mod_id: String, enabled: bool) -> Result<bool, String> {
    let (engine, entry, on_enable, on_disable) = {
        let reg = REGISTRY.lock().unwrap();
        match reg.mods.get(&mod_id) {
            Some(m) => {
                let rt = m.runtime_dir();
                (
                    m.engine.clone(),
                    rt.join(&m.entry_file),
                    m.on_enable_file.as_ref().map(|f| rt.join(f)),
                    m.on_disable_file.as_ref().map(|f| rt.join(f)),
                )
            }
            None => return Err(DanhawkError::NotFound(mod_id.clone()).into()),
        }
    };

    let result = if enabled {
        logger::info(&format!("[mods] enabling: {} via {}", mod_id, engine));
        engines::start(&engine, &mod_id, &entry, on_enable.as_ref())
    } else {
        logger::info(&format!("[mods] disabling: {}", mod_id));
        engines::stop(&engine, &mod_id, on_disable.as_ref())
    };

    match result {
        Ok(()) => {
            let mut reg = REGISTRY.lock().unwrap();
            if let Some(m) = reg.mods.get_mut(&mod_id) { m.enabled = enabled; }
            save_state(&reg); Ok(true)
        }
        Err(e) => { logger::error(&format!("[mods] toggle failed {}: {}", mod_id, e)); Err(e.into()) }
    }
}

// ── Shutdown ──────────────────────────────────────────────────────────────────

pub fn shutdown() {
    let mods: Vec<ModInfo> = {
        let reg = REGISTRY.lock().unwrap();
        reg.mods.values().filter(|m| m.enabled).cloned().collect()
    };
    for m in &mods {
        if let Some(ref fname) = m.on_disable_file {
            let hook = m.runtime_dir().join(fname);
            if hook.exists() {
                logger::info(&format!("[shutdown] on_disable for '{}'", m.id));
                if let Err(e) = engines::run_hook(&hook) {
                    logger::warn(&format!("[shutdown] on_disable failed '{}': {}", m.id, e));
                }
            }
        }
    }
    engines::stop_all();
    logger::info("[shutdown] all extensions stopped");
}