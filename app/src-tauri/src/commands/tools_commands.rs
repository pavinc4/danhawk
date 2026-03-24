// tools_commands.rs
// Core platform commands: fetch tools from GitHub, install, toggle, remove.
// Tools are identified by their folder in the tools-repo GitHub repository.
// Each tool has a manifest.json and a run.ps1 entry point.
// Platform always calls: powershell run.ps1 <action>

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

const GITHUB_OWNER:  &str = "pavinc4";
const GITHUB_REPO:   &str = "tools-repo";
const GITHUB_BRANCH: &str = "main";

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

// ── Tools cache ───────────────────────────────────────────────────────────────

fn cache_file() -> PathBuf {
    let dir = paths::appdata_dir();
    let _ = fs::create_dir_all(&dir);
    dir.join("tools_cache.json")
}

fn save_tools_cache(tools: &[ToolInfo]) {
    if let Ok(json) = serde_json::to_string(tools) {
        let _ = fs::write(cache_file(), json);
        logger::info(&format!("[tools] cached {} tools to disk", tools.len()));
    }
}

pub fn load_tools_cache() -> Vec<ToolInfo> {
    let raw = match fs::read_to_string(cache_file()) {
        Ok(s) => s,
        Err(_) => return vec![],
    };
    serde_json::from_str::<Vec<ToolInfo>>(&raw).unwrap_or_default()
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
    download_url: Option<String>,
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

// ── Recursive GitHub download ─────────────────────────────────────────────────
// Downloads all files in a folder recursively, preserving subdirectory structure.

fn download_folder_recursive(repo_path: &str, local_dir: &std::path::Path) -> Result<(), String> {
    fs::create_dir_all(local_dir).map_err(|e| format!("create dir {}: {}", local_dir.display(), e))?;

    let resp = ureq::get(&github_api_url(repo_path))
        .set("User-Agent", "danhawk-app")
        .call()
        .map_err(|e| format!("GitHub API failed for '{}': {}", repo_path, e))?;

    let entries: Vec<GhEntry> = resp.into_json()
        .map_err(|e| format!("GitHub API parse failed for '{}': {}", repo_path, e))?;

    for entry in &entries {
        match entry.entry_type.as_str() {
            "file" => {
                let raw_url = github_raw_url(&format!("{}/{}", repo_path, entry.name));
                let file_resp = ureq::get(&raw_url)
                    .set("User-Agent", "danhawk-app")
                    .call()
                    .map_err(|e| format!("fetch failed for '{}': {}", entry.name, e))?;

                let mut bytes = Vec::new();
                file_resp.into_reader().read_to_end(&mut bytes)
                    .map_err(|e| format!("read failed for '{}': {}", entry.name, e))?;

                fs::write(local_dir.join(&entry.name), &bytes)
                    .map_err(|e| format!("write failed for '{}': {}", entry.name, e))?;

                logger::info(&format!("[install] downloaded: {}/{}", repo_path, entry.name));
            }
            "dir" => {
                // Recurse into subdirectory
                let sub_repo = format!("{}/{}", repo_path, entry.name);
                let sub_local = local_dir.join(&entry.name);
                download_folder_recursive(&sub_repo, &sub_local)?;
            }
            _ => {}
        }
    }

    Ok(())
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
struct ToolUISlots {
    #[serde(default)] detail_actions: Vec<DetailActionSlot>,
    #[serde(default)] detail_tabs:    Vec<DetailTabSlot>,
    #[serde(default)] side_panel:     Option<SidePanelSlot>,
    #[serde(default)] status_bar:     Option<StatusBarSlot>,
}

// ── Info tab (from info/ folder .md files) ────────────────────────────────────

#[derive(Deserialize, Serialize, Clone, Default)]
pub struct InfoTab {
    pub label:   String, // filename without .md, capitalized
    pub content: String, // markdown content
}

// ── Manifest ──────────────────────────────────────────────────────────────────
// Clean — no engine, no lifecycle block, no source_visible

#[derive(Deserialize, Clone)]
struct Manifest {
    id:          String,
    name:        String,
    version:     String,
    author:      String,
    description: String,
    entry:       String,   // always "run.ps1"
    #[serde(default)] category:   String,
    #[serde(default)] icon:       String,
    #[serde(default)] icon_color: String,
    #[serde(default)] icon_bg:    String,
    #[serde(default)] targets:    Vec<String>,
    #[serde(default)] ui:         ToolUISlots,
}

// ── ToolInfo sent to frontend ─────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone)]
pub struct ToolInfo {
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
    pub tool_type:   String,
    pub removable:   bool,
    pub editable:    bool,
    pub installed:   bool,
    pub enabled:     bool,
    pub info_tabs:   Vec<InfoTab>,  // dynamic from info/ folder
    pub ui:          Option<ToolUISlots>,
}

impl ToolInfo {
    pub fn runtime_dir(&self) -> PathBuf {
        paths::installed_tool_dir(&self.id)
    }
}

// ── Persisted state ───────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Default, Clone)]
struct ToolState {
    installed: bool,
    enabled:   bool,
}

#[derive(Serialize, Deserialize, Default)]
struct PersistedState {
    tools: HashMap<String, ToolState>,
}

fn load_state() -> PersistedState {
    let path = paths::state_file();
    fs::read_to_string(&path).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
}

fn save_state(reg: &Registry) {
    let mut ps = PersistedState::default();
    for (id, t) in &reg.tools {
        ps.tools.insert(id.clone(), ToolState { installed: t.installed, enabled: t.enabled });
    }
    if let Ok(json) = serde_json::to_string_pretty(&ps) {
        let _ = fs::write(paths::state_file(), json);
    }
}

// ── In-memory registry ────────────────────────────────────────────────────────

pub struct Registry { pub tools: HashMap<String, ToolInfo> }
pub static REGISTRY: Lazy<Mutex<Registry>> =
    Lazy::new(|| Mutex::new(Registry { tools: HashMap::new() }));

// ── Connectivity check ────────────────────────────────────────────────────────

fn is_online() -> bool {
    ureq::get("https://github.com")
        .set("User-Agent", "danhawk-app")
        .timeout(std::time::Duration::from_secs(3))
        .call()
        .is_ok()
}

// ── Fetch info/ tabs from GitHub ──────────────────────────────────────────────
// Scans the tool's info/ folder and returns one InfoTab per .md file.
// Tab label = filename without extension, first letter capitalised.

fn fetch_info_tabs(folder_path: &str) -> Vec<InfoTab> {
    let info_path = format!("{}/info", folder_path);
    let resp = match ureq::get(&github_api_url(&info_path))
        .set("User-Agent", "danhawk-app")
        .call() {
        Ok(r) => r,
        Err(_) => return vec![],
    };

    let entries: Vec<GhEntry> = match resp.into_json() {
        Ok(v) => v,
        Err(_) => return vec![],
    };

    let mut tabs = Vec::new();
    for entry in &entries {
        if entry.entry_type != "file" { continue; }
        if !entry.name.ends_with(".md") { continue; }

        let label = {
            let stem = entry.name.trim_end_matches(".md");
            let mut chars = stem.chars();
            match chars.next() {
                None => String::new(),
                Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
            }
        };

        let content = fetch_text(&github_raw_url(&format!("{}/info/{}", folder_path, entry.name)));
        if !content.is_empty() {
            tabs.push(InfoTab { label, content });
        }
    }

    // Sort: Details first, Changelog last, others alphabetically in between
    tabs.sort_by(|a, b| {
        let order = |s: &str| match s {
            "Details" => 0,
            "Changelog" => 2,
            _ => 1,
        };
        order(&a.label).cmp(&order(&b.label)).then(a.label.cmp(&b.label))
    });

    tabs
}

// ── GitHub fetch ──────────────────────────────────────────────────────────────

fn fetch_from_github() -> Vec<ToolInfo> {
    if !is_online() {
        logger::info("[tools] offline — loading from cache");
        return load_tools_cache();
    }

    logger::info("[tools] fetching tool list from GitHub");

    let resp = match ureq::get(&github_api_url("")).set("User-Agent", "danhawk-app").call() {
        Ok(r) => r,
        Err(e) => { logger::warn(&format!("[tools] GitHub API failed: {}", e)); return vec![]; }
    };

    let entries: Vec<GhEntry> = match resp.into_json() {
        Ok(v) => v,
        Err(e) => { logger::warn(&format!("[tools] GitHub API parse failed: {}", e)); return vec![]; }
    };

    let folders: Vec<String> = entries.into_iter()
        .filter(|e| e.entry_type == "dir")
        .map(|e| e.name)
        .collect();

    logger::info(&format!("[tools] fetching {} folders concurrently", folders.len()));

    let handles: Vec<_> = folders.into_iter().map(|folder| {
        std::thread::spawn(move || {
            let manifest_url = github_raw_url(&format!("{}/manifest.json", &folder));
            let raw = fetch_text(&manifest_url);
            if raw.is_empty() {
                logger::warn(&format!("[tools] no manifest for '{}'", folder));
                return None;
            }

            let manifest: Manifest = match serde_json::from_str(&raw) {
                Ok(m) => m,
                Err(e) => { logger::warn(&format!("[tools] bad manifest '{}': {}", folder, e)); return None; }
            };

            logger::info(&format!("[tools] loaded: {}", manifest.id));

            // Fetch info/ tabs dynamically
            let info_tabs = fetch_info_tabs(&folder);

            // Fetch icon file if present
            let icon_file = ["icon.png","icon.jpg","icon.jpeg","icon.ico","icon.svg","icon.webp"]
                .iter()
                .find_map(|name| {
                    let bytes = fetch_bytes(&github_raw_url(&format!("{}/{}", &folder, name)));
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

            Some(ToolInfo {
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
                tool_type:   "official".into(),
                removable:   false,
                editable:    false,
                installed:   false,
                enabled:     false,
                info_tabs,
                ui: if ui_empty { None } else { Some(manifest.ui) },
            })
        })
    }).collect();

    let mut result: Vec<ToolInfo> = handles.into_iter()
        .filter_map(|h| h.join().ok().flatten())
        .collect();

    result.sort_by(|a, b| a.name.cmp(&b.name));
    logger::info(&format!("[tools] fetched {} tools from GitHub", result.len()));
    save_tools_cache(&result);
    result
}

// ── Startup ───────────────────────────────────────────────────────────────────

pub fn kill_orphans() {
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

pub fn restore_tools_only() {
    let state = load_state();

    for (id, s) in &state.tools {
        if !s.enabled { continue; }

        let tool_dir = paths::installed_tool_dir(id);
        if !tool_dir.exists() {
            logger::warn(&format!("[startup] tool dir missing for '{}', skipping", id));
            continue;
        }

        if !tool_dir.join("run.ps1").exists() {
            logger::warn(&format!("[startup] run.ps1 missing for '{}', skipping", id));
            continue;
        }

        logger::info(&format!("[startup] restoring: {}", id));
        if let Err(e) = engines::enable(id, &tool_dir) {
            logger::error(&format!("[startup] failed to restore {}: {}", id, e));
        }
    }

    logger::info("[startup] done — window ready");
}

pub fn restore_on_startup() {
    kill_orphans();

    // Populate the in-memory registry from disk cache immediately
    let cached = load_tools_cache();
    if !cached.is_empty() {
        let mut reg = REGISTRY.lock().unwrap();
        for tool in cached {
            reg.tools.insert(tool.id.clone(), tool);
        }
        logger::info("[startup] loaded tools from cache into registry");
        drop(reg);
    }

    restore_tools_only();
}

// ── Tauri commands ────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_tools() -> Vec<ToolInfo> {
    let reg = REGISTRY.lock().unwrap();

    // If registry is empty (e.g. first call before restore_on_startup finishes),
    // fall back to disk cache so Explore never shows blank.
    let tools_map = if reg.tools.is_empty() {
        drop(reg);
        let cached = load_tools_cache();
        if !cached.is_empty() {
            let mut reg2 = REGISTRY.lock().unwrap();
            for tool in cached {
                reg2.tools.insert(tool.id.clone(), tool);
            }
            let snap: HashMap<String, ToolInfo> = reg2.tools.clone();
            drop(reg2);
            snap
        } else {
            HashMap::new()
        }
    } else {
        let snap = reg.tools.clone();
        drop(reg);
        snap
    };

    let state = load_state();
    let mut r: Vec<ToolInfo> = tools_map.into_values().map(|mut t| {
        if let Some(s) = state.tools.get(&t.id) {
            t.installed = s.installed;
            t.enabled   = s.enabled;
        }
        t
    }).collect();
    r.sort_by(|a, b| a.name.cmp(&b.name));
    r
}

#[tauri::command]
pub fn check_online() -> bool {
    is_online()
}

#[tauri::command]
pub fn clear_tools_cache() -> bool {
    let path = cache_file();
    if path.exists() {
        let _ = fs::remove_file(&path);
        let mut reg = REGISTRY.lock().unwrap();
        reg.tools.clear();
        logger::info("[tools] cache cleared");
        return true;
    }
    false
}

#[tauri::command]
pub async fn refresh_tools() -> Vec<ToolInfo> {
    tauri::async_runtime::spawn_blocking(|| {
        let mut tools = fetch_from_github();
        let state = load_state();
        for t in &mut tools {
            if let Some(s) = state.tools.get(&t.id) {
                t.installed = s.installed;
                t.enabled   = s.enabled;
            }
        }
        let mut reg = REGISTRY.lock().unwrap();
        reg.tools.clear();
        for t in &tools { reg.tools.insert(t.id.clone(), t.clone()); }
        let mut r: Vec<ToolInfo> = reg.tools.values().cloned().collect();
        r.sort_by(|a, b| a.name.cmp(&b.name));
        r
    })
    .await
    .unwrap_or_default()
}

#[tauri::command]
pub fn install_tool(app: tauri::AppHandle, tool_id: String) -> Result<bool, String> {
    let tool_dir = paths::installed_tool_dir(&tool_id);

    logger::info(&format!("[install] downloading '{}' from GitHub", tool_id));
    download_folder_recursive(&tool_id, &tool_dir)
        .map_err(|e| format!("install failed for '{}': {}", tool_id, e))?;
    logger::info(&format!("[install] '{}' downloaded successfully", tool_id));

    // Run install action
    if let Err(e) = engines::install(&tool_id, &tool_dir) {
        logger::warn(&format!("[install] run.ps1 install failed for '{}': {}", tool_id, e));
        // Don't fail the whole install — install hook is optional
    }

    let mut reg = REGISTRY.lock().unwrap();
    match reg.tools.get_mut(&tool_id) {
        Some(t) => {
            t.installed = true;
            logger::info(&format!("[tools] installed: {}", tool_id));
            save_state(&reg);
            let _ = tauri::Emitter::emit(&app, "tools-changed", ());
            Ok(true)
        }
        None => Err(DanhawkError::NotFound(tool_id).into()),
    }
}

#[tauri::command]
pub fn remove_tool(app: tauri::AppHandle, tool_id: String) -> Result<bool, String> {
    let tool_dir = paths::installed_tool_dir(&tool_id);

    // Run uninstall action first (tool cleans up registry entries etc.)
    if tool_dir.exists() {
        if let Err(e) = engines::uninstall(&tool_id, &tool_dir) {
            logger::warn(&format!("[uninstall] run.ps1 uninstall failed for '{}': {}", tool_id, e));
        }
    }

    // Delete tool folder from AppData
    if tool_dir.exists() {
        match fs::remove_dir_all(&tool_dir) {
            Ok(_)  => logger::info(&format!("[uninstall] deleted tool dir for '{}'", tool_id)),
            Err(e) => logger::warn(&format!("[uninstall] delete failed for '{}': {}", tool_id, e)),
        }
    }

    let mut reg = REGISTRY.lock().unwrap();
    if let Some(t) = reg.tools.get_mut(&tool_id) {
        t.installed = false;
        t.enabled   = false;
        logger::info(&format!("[tools] uninstalled: {}", tool_id));
        save_state(&reg);
        let _ = tauri::Emitter::emit(&app, "tools-changed", ());
    }
    Ok(true)
}

#[tauri::command]
pub fn toggle_tool(app: tauri::AppHandle, tool_id: String, enabled: bool) -> Result<bool, String> {
    let tool_dir = paths::installed_tool_dir(&tool_id);

    let result = if enabled {
        logger::info(&format!("[tools] enabling: {}", tool_id));
        engines::enable(&tool_id, &tool_dir)
    } else {
        logger::info(&format!("[tools] disabling: {}", tool_id));
        engines::disable(&tool_id)
    };

    match result {
        Ok(()) => {
            let mut reg = REGISTRY.lock().unwrap();
            if let Some(t) = reg.tools.get_mut(&tool_id) { t.enabled = enabled; }
            save_state(&reg);
            let _ = tauri::Emitter::emit(&app, "tools-changed", ());
            Ok(true)
        }
        Err(e) => {
            logger::error(&format!("[tools] toggle failed {}: {}", tool_id, e));
            Err(e.into())
        }
    }
}

// ── Shutdown ──────────────────────────────────────────────────────────────────


// ── open_tool ─────────────────────────────────────────────────────────────────
// Called from the launcher when user clicks a tool.
// Runs run.ps1 with the "open" action — each tool decides what "open" means
// (e.g. bring window to front, launch GUI, show notification).
// Does NOT change enabled/disabled state.
#[tauri::command]
pub fn open_tool(tool_id: String) -> Result<bool, String> {
    let tool_dir = paths::installed_tool_dir(&tool_id);
    if !tool_dir.exists() {
        return Err(format!("Tool '{}' is not installed", tool_id));
    }
    logger::info(&format!("[tools] opening: {}", tool_id));
    match engines::open(&tool_id, &tool_dir) {
        Ok(()) => Ok(true),
        Err(e) => {
            logger::error(&format!("[tools] open failed {}: {}", tool_id, e));
            Err(e.into())
        }
    }
}

pub fn shutdown() {
    // Run disable hook for all enabled tools (registry cleanup etc.)
    let enabled_tools: Vec<String> = {
        let reg = REGISTRY.lock().unwrap();
        reg.tools.values()
            .filter(|t| t.enabled)
            .map(|t| t.id.clone())
            .collect()
    };

    for id in &enabled_tools {
        let tool_dir = paths::installed_tool_dir(id);
        if tool_dir.join("run.ps1").exists() {
            let _ = crate::engines::disable(id);
        }
    }

    engines::stop_all();
    logger::info("[shutdown] all tools stopped");
}