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

// ── Windows Job Object ────────────────────────────────────────────────────────

#[cfg(windows)]
pub mod job {
    use once_cell::sync::Lazy;
    use windows_sys::Win32::Foundation::HANDLE;
    use windows_sys::Win32::System::JobObjects::{
        AssignProcessToJobObject,
        JobObjectExtendedLimitInformation,
        QueryInformationJobObject,
        SetInformationJobObject,
        JOBOBJECT_EXTENDED_LIMIT_INFORMATION,
        JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
    };

    pub struct Job(HANDLE);
    unsafe impl Send for Job {}
    unsafe impl Sync for Job {}

    impl Job {
        fn create() -> Self {
            unsafe {
                let handle = windows_sys::Win32::System::JobObjects::CreateJobObjectW(
                    std::ptr::null(),
                    std::ptr::null(),
                );
                assert!(!handle.is_null(), "CreateJobObject failed");

                let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = std::mem::zeroed();
                QueryInformationJobObject(
                    handle,
                    JobObjectExtendedLimitInformation,
                    &mut info as *mut _ as *mut _,
                    std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
                    std::ptr::null_mut(),
                );

                info.BasicLimitInformation.LimitFlags |= JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
                SetInformationJobObject(
                    handle,
                    JobObjectExtendedLimitInformation,
                    &info as *const _ as *const _,
                    std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
                );

                Job(handle)
            }
        }

        pub fn assign(&self, process_handle: HANDLE) {
            unsafe {
                AssignProcessToJobObject(self.0, process_handle);
            }
        }
    }

    pub static GLOBAL_JOB: Lazy<Job> = Lazy::new(Job::create);
}

// ── Assign child to the job ───────────────────────────────────────────────────

#[cfg(windows)]
fn assign_to_job(child: &Child) {
    use std::os::windows::io::AsRawHandle;
    job::GLOBAL_JOB.assign(
        child.as_raw_handle() as windows_sys::Win32::Foundation::HANDLE
    );
}

// ── Process tracking ──────────────────────────────────────────────────────────

static RUNNING: Lazy<Mutex<HashMap<String, Child>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

fn kill_pid(pid: u32, label: &str) {
    logger::info(&format!("[command-engine] killing PID {} ({})", pid, label));
    #[cfg(windows)]
    {
        let _ = Command::new("taskkill")
            .args(["/F", "/T", "/PID", &pid.to_string()])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
    }
    std::thread::sleep(std::time::Duration::from_millis(300));
}

// ── Hook runner ───────────────────────────────────────────────────────────────
// Runs any supported file type and WAITS for it to finish.
// Used for lifecycle hooks (on_enable / on_disable).
// Supports: .ps1  .bat  .cmd  .exe  .ahk
// This is public so engines/mod.rs can call it for any engine's lifecycle hooks.

pub fn run_hook(path: &Path) -> Result<(), DanhawkError> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let path_str = path.to_str().unwrap_or("");
    logger::info(&format!("[command-engine] run_hook: {} (.{})", path_str, ext));

    let mut cmd = match ext.as_str() {
        "ps1" => {
            let mut c = Command::new("powershell");
            c.args([
                "-NonInteractive",
                "-WindowStyle", "Hidden",
                "-ExecutionPolicy", "Bypass",
                "-File", path_str,
            ]);
            c
        }
        "bat" | "cmd" => {
            let mut c = Command::new("cmd");
            c.args(["/C", path_str]);
            c
        }
        "exe" => {
            Command::new(path_str)
        }
        "ahk" => {
            let ahk = paths::ahk_exe().ok_or_else(|| {
                DanhawkError::Engine("AutoHotkey64.exe not found".into())
            })?;
            let mut c = Command::new(ahk);
            c.arg(path_str);
            c
        }
        other => {
            return Err(DanhawkError::Engine(format!(
                "run_hook: unsupported file type '.{}' for: {}", other, path_str
            )));
        }
    };

    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    // Wait for hook to complete — hooks are setup/teardown scripts, not long-running
    match cmd.output() {
        Ok(out) => {
            if !out.status.success() {
                let stderr = String::from_utf8_lossy(&out.stderr);
                if !stderr.trim().is_empty() {
                    logger::warn(&format!("[command-engine] hook exited non-zero: {}", stderr));
                }
            }
            Ok(())
        }
        Err(e) => Err(DanhawkError::Engine(format!(
            "run_hook failed for '{}': {}", path_str, e
        ))),
    }
}

// ── Start ─────────────────────────────────────────────────────────────────────
// Spawns a LONG-RUNNING process and tracks it.
// Only called when extension has NO on_enable lifecycle hook.

pub fn start(mod_id: &str, entry_path: &Path) -> Result<(), DanhawkError> {
    let _ = stop(mod_id);

    let ext = entry_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let path_str = entry_path.to_str().unwrap_or("");
    logger::info(&format!("[command-engine] starting '{}' (.{})", mod_id, ext));

    let child = match ext.as_str() {
        "cmd" | "bat" => {
            let mut cmd = Command::new("cmd");
            cmd.args(["/C", path_str]);
            #[cfg(windows)]
            cmd.creation_flags(CREATE_NO_WINDOW);
            cmd.spawn().map_err(|e| DanhawkError::Engine(
                format!("cmd spawn failed for '{}': {}", mod_id, e)
            ))?
        }
        "ps1" => {
            let mut cmd = Command::new("powershell");
            cmd.args([
                "-NonInteractive",
                "-WindowStyle", "Hidden",
                "-ExecutionPolicy", "Bypass",
                "-File", path_str,
            ]);
            #[cfg(windows)]
            cmd.creation_flags(CREATE_NO_WINDOW);
            cmd.spawn().map_err(|e| DanhawkError::Engine(
                format!("powershell spawn failed for '{}': {}", mod_id, e)
            ))?
        }
        other => return Err(DanhawkError::Engine(format!(
            "unsupported entry type '.{}' for mod '{}'", other, mod_id
        ))),
    };

    let pid = child.id();

    #[cfg(windows)]
    assign_to_job(&child);

    let _ = fs::write(paths::pid_file(mod_id), pid.to_string());
    RUNNING.lock().unwrap().insert(mod_id.to_string(), child);
    logger::info(&format!("[command-engine] started '{}' PID {} (job assigned)", mod_id, pid));
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

    logger::info(&format!("[command-engine] stopped: {}", mod_id));
    Ok(())
}

// ── Stop all — clean quit ─────────────────────────────────────────────────────

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
        logger::info(&format!("[command-engine] stopped (quit): {} PID {}", id, pid));
    }
}

pub fn is_running(mod_id: &str) -> bool {
    RUNNING.lock().unwrap().contains_key(mod_id)
}