use std::collections::HashMap;
use std::fs;
use std::process::{Child, Command};
use std::sync::Mutex;
use once_cell::sync::Lazy;

use crate::core::{error::DanhawkError, logger, paths};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

static RUNNING: Lazy<Mutex<HashMap<String, Child>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

fn kill_pid(pid: u32) {
    #[cfg(windows)]
    {
        let _ = Command::new("taskkill")
            .args(["/F", "/T", "/PID", &pid.to_string()])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
    }
    std::thread::sleep(std::time::Duration::from_millis(200));
}

pub fn start(mod_id: &str, entry_path: &std::path::Path) -> Result<(), DanhawkError> {
    let _ = stop(mod_id);

    let ahk_exe = paths::ahk_exe().ok_or_else(|| {
        DanhawkError::Engine(
            "AutoHotkey64.exe not found. Place it at src-tauri/resources/AutoHotkey64.exe".into()
        )
    })?;

    let script_path = entry_path.to_str().unwrap_or("");
    logger::info(&format!("[ahk-engine] starting '{}' with {}", mod_id, ahk_exe.display()));

    let mut cmd = Command::new(&ahk_exe);
    cmd.arg(script_path);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let child = cmd.spawn().map_err(|e| {
        DanhawkError::Engine(format!("AHK spawn failed for '{}': {}", mod_id, e))
    })?;

    let pid = child.id();

    // Add to Job Object — dies when DanHawk dies for any reason
    #[cfg(windows)]
    {
        use std::os::windows::io::AsRawHandle;
        super::command::job::GLOBAL_JOB.assign(
            child.as_raw_handle() as windows_sys::Win32::Foundation::HANDLE
        );
    }

    let _ = fs::write(paths::pid_file(mod_id), pid.to_string());
    RUNNING.lock().unwrap().insert(mod_id.to_string(), child);
    logger::info(&format!("[ahk-engine] started '{}' PID {} (job assigned)", mod_id, pid));
    Ok(())
}

pub fn stop(mod_id: &str) -> Result<(), DanhawkError> {
    let pid_path = paths::pid_file(mod_id);
    if pid_path.exists() {
        if let Ok(s) = fs::read_to_string(&pid_path) {
            if let Ok(pid) = s.trim().parse::<u32>() {
                kill_pid(pid);
            }
        }
        let _ = fs::remove_file(&pid_path);
    }
    let mut map = RUNNING.lock().unwrap();
    if let Some(mut child) = map.remove(mod_id) {
        kill_pid(child.id());
        let _ = child.kill();
        let _ = child.wait();
    }
    logger::info(&format!("[ahk-engine] stopped: {}", mod_id));
    Ok(())
}

pub fn stop_all() {
    let mut map = RUNNING.lock().unwrap();
    for (id, mut child) in map.drain() {
        kill_pid(child.id());
        let _ = child.kill();
        let _ = child.wait();
        let _ = fs::remove_file(paths::pid_file(&id));
        let pid_val = child.id(); logger::info(&format!("[ahk-engine] stopped (quit): {} PID {}", id, pid_val));
    }
}

pub fn is_running(mod_id: &str) -> bool {
    RUNNING.lock().unwrap().contains_key(mod_id)
}