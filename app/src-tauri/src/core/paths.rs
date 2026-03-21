use std::path::PathBuf;

pub fn appdata_dir() -> PathBuf {
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        PathBuf::from(local).join("Danhawk")
    } else {
        std::env::temp_dir().join("danhawk")
    }
}

pub fn find_dir(name: &str) -> PathBuf {
    let exe = std::env::current_exe().unwrap_or_default();
    let exe_dir = exe.parent().unwrap_or(std::path::Path::new(".")).to_path_buf();
    let cwd = std::env::current_dir().unwrap_or_default();
    let search_roots = [exe_dir.clone(), cwd];
    for root in &search_roots {
        let mut dir = root.clone();
        for _ in 0..15 {
            let c = dir.join(name);
            if c.exists() { return c; }
            if !dir.pop() { break; }
        }
    }
    exe_dir.join(name)
}

// Tools repo folder (dev only — not present in production)
pub fn tools_repo_dir() -> PathBuf {
    find_dir("tools-repo")
}

// Installed tools — AppData runtime copies
pub fn installed_tools_dir() -> PathBuf {
    let dir = appdata_dir().join("tools");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

pub fn installed_tool_dir(tool_id: &str) -> PathBuf {
    installed_tools_dir().join(tool_id)
}

pub fn logs_dir() -> PathBuf {
    let dir = appdata_dir().join("logs");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

pub fn state_file() -> PathBuf {
    let dir = appdata_dir();
    let _ = std::fs::create_dir_all(&dir);
    dir.join("state.json")
}

pub fn pids_dir() -> PathBuf {
    let dir = appdata_dir().join("pids");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

pub fn pid_file(tool_id: &str) -> PathBuf {
    pids_dir().join(format!("{}.pid", tool_id))
}

// Bundled AutoHotkey runtime
pub fn ahk_exe() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let exe_dir = exe.parent()?;
    let prod = exe_dir.join("resources").join("AutoHotkey64.exe");
    if prod.exists() { return Some(prod); }
    let dev = find_dir("resources").join("AutoHotkey64.exe");
    if dev.exists() { return Some(dev); }
    None
}

// Bundled Python runtime
pub fn python_exe() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let exe_dir = exe.parent()?;
    let prod = exe_dir.join("resources").join("python").join("python.exe");
    if prod.exists() { return Some(prod); }
    let dev = find_dir("resources").join("python").join("python.exe");
    if dev.exists() { return Some(dev); }
    None
}
