use std::path::PathBuf;

fn appdata_dir() -> PathBuf {
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        PathBuf::from(local).join("Danhawk")
    } else {
        std::env::temp_dir().join("danhawk")
    }
}

pub fn find_dir(name: &str) -> PathBuf {
    let exe = std::env::current_exe().unwrap_or_default();
    let exe_dir = exe.parent().unwrap_or(std::path::Path::new(".")).to_path_buf();

    // Also try current working directory (useful in dev)
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

pub fn extensions_dir() -> PathBuf {
    find_dir("extensions-repo")
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

pub fn pid_file(mod_id: &str) -> PathBuf {
    pids_dir().join(format!("{}.pid", mod_id))
}

pub fn ahk_exe() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let exe_dir = exe.parent()?;

    // Production
    let prod = exe_dir.join("resources").join("AutoHotkey64.exe");
    if prod.exists() { return Some(prod); }

    // Dev
    let dev = find_dir("resources").join("AutoHotkey64.exe");
    if dev.exists() { return Some(dev); }

    None
}