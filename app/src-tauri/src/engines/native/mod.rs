// Native engine — runs compiled .exe files directly.
// Same pattern as the command engine but no shell wrapper.
// Entry file must be a .exe — platform spawns it directly.
// Job Object ensures the process dies with Danhawk on any exit path.

use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::process::{Child, Command};
use std::sync::Mutex;
use once_cell::sync::Lazy;

use crate::core::{error::DanhawkError, logger, paths};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

// ── Process tracking ──────────────────────────────────────────────────────────

static RUNNING: Lazy<Mutex<HashMap<String, Child>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

fn kill_pid(pid: u32, label: &str) {
    logger::info(&format!("[native-engine] killing PID {} ({})", pid, label));
    #[cfg(windows)]
    {
        let _ = Command::new("taskkill")
            .args(["/F", "/T", "/PID", &pid.to_string()])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
    }
    std::thread::sleep(std::time::Duration::from_millis(300));
}

// ── Start ─────────────────────────────────────────────────────────────────────
// Spawns the .exe directly — no shell wrapper.
// Assigns to the global Job Object so it dies when Danhawk exits.

pub fn start(mod_id: &str, entry_path: &Path) -> Result<(), DanhawkError> {
    // Stop any existing instance first
    let _ = stop(mod_id);

    let ext = entry_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    if ext != "exe" {
        return Err(DanhawkError::Engine(format!(
            "native engine only supports .exe files, got '.{}' for '{}'",
            ext, mod_id
        )));
    }

    let path_str = entry_path.to_str().unwrap_or("");
    logger::info(&format!("[native-engine] starting '{}': {}", mod_id, path_str));

    let mut cmd = Command::new(entry_path);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let child = cmd.spawn().map_err(|e| {
        DanhawkError::Engine(format!("exe spawn failed for '{}': {}", mod_id, e))
    })?;

    let pid = child.id();

    // Assign to Job Object — process dies when Danhawk exits for any reason
    #[cfg(windows)]
    {
        use std::os::windows::io::AsRawHandle;
        super::command::job::GLOBAL_JOB.assign(
            child.as_raw_handle() as windows_sys::Win32::Foundation::HANDLE
        );
    }

    let _ = fs::write(paths::pid_file(mod_id), pid.to_string());
    RUNNING.lock().unwrap().insert(mod_id.to_string(), child);
    logger::info(&format!("[native-engine] started '{}' PID {} (job assigned)", mod_id, pid));
    Ok(())
}

// ── Stop ──────────────────────────────────────────────────────────────────────

pub fn stop(mod_id: &str) -> Result<(), DanhawkError> {
    let pid_path = paths::pid_file(mod_id);
    if pid_path.exists() {
        if let Ok(contents) = fs::read_to_string(&pid_path) {
            if let Ok(pid) = contents.trim().parse::<u32>() {
                kill_pid(pid, mod_id);
            }
        }
        let _ = fs::remove_file(&pid_path);
    }

    let mut map = RUNNING.lock().unwrap();
    if let Some(mut child) = map.remove(mod_id) {
        kill_pid(child.id(), mod_id);
        let _ = child.kill();
        let _ = child.wait();
    }

    logger::info(&format!("[native-engine] stopped: {}", mod_id));
    Ok(())
}

// ── Stop all ──────────────────────────────────────────────────────────────────

pub fn stop_all() {
    let mut map = RUNNING.lock().unwrap();
    for (id, mut child) in map.drain() {
        let pid = child.id();
        #[cfg(windows)]
        {
            let _ = Command::new("taskkill")
                .args(["/F", "/T", "/PID", &pid.to_string()])
                .creation_flags(CREATE_NO_WINDOW)
                .output();
        }
        let _ = child.kill();
        let _ = child.wait();
        let _ = fs::remove_file(paths::pid_file(&id));
        logger::info(&format!("[native-engine] stopped (quit): {} PID {}", id, pid));
    }
}

pub fn is_running(mod_id: &str) -> bool {
    RUNNING.lock().unwrap().contains_key(mod_id)
}