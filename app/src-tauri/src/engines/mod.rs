// engines/mod.rs
// Simplified engine layer — all tools use a single run.ps1 entry point.
// Platform calls: powershell run.ps1 <action>
// Actions: enable | disable | install | uninstall | open
//
// Tools own all runtime logic internally via run.ps1.
// Platform stays completely dumb — it only knows how to call one script.

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

// ── Windows Job Object — kills child processes when platform exits ────────────

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
            unsafe { AssignProcessToJobObject(self.0, process_handle); }
        }
    }

    pub static GLOBAL_JOB: Lazy<Job> = Lazy::new(Job::create);
}

// ── Process tracking ──────────────────────────────────────────────────────────

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
    std::thread::sleep(std::time::Duration::from_millis(300));
}

// ── Run run.ps1 with an action ────────────────────────────────────────────────
// For "enable" — spawns and tracks the process (tool may stay alive).
// For "disable" / "install" / "uninstall" / "open" — waits for completion.

fn run_script(tool_dir: &Path, action: &str, track: bool) -> Result<(), DanhawkError> {
    let script = tool_dir.join("run.ps1");
    if !script.exists() {
        return Err(DanhawkError::Engine(format!(
            "run.ps1 not found in: {}", tool_dir.display()
        )));
    }

    let script_str = script.to_str().unwrap_or("");
    logger::info(&format!("[engine] run.ps1 {} — {}", action, tool_dir.display()));

    let mut cmd = Command::new("powershell");
    cmd.args([
        "-NonInteractive",
        "-WindowStyle", "Hidden",
        "-ExecutionPolicy", "Bypass",
        "-File", script_str,
        action,
    ]);

    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    if track {
        let child = cmd.spawn().map_err(|e| {
            DanhawkError::Engine(format!("spawn failed for run.ps1 enable: {}", e))
        })?;

        let pid = child.id();

        #[cfg(windows)]
        {
            use std::os::windows::io::AsRawHandle;
            job::GLOBAL_JOB.assign(child.as_raw_handle() as windows_sys::Win32::Foundation::HANDLE);
        }

        let tool_id = tool_dir.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        let _ = fs::write(paths::pid_file(&tool_id), pid.to_string());
        RUNNING.lock().unwrap().insert(tool_id.clone(), child);
        logger::info(&format!("[engine] started '{}' PID {}", tool_id, pid));
    } else {
        match cmd.output() {
            Ok(out) => {
                if !out.status.success() {
                    let stderr = String::from_utf8_lossy(&out.stderr);
                    if !stderr.trim().is_empty() {
                        logger::warn(&format!("[engine] run.ps1 {} exited non-zero: {}", action, stderr));
                    }
                }
            }
            Err(e) => return Err(DanhawkError::Engine(format!(
                "run.ps1 {} failed: {}", action, e
            ))),
        }
    }

    Ok(())
}

// ── Public API ────────────────────────────────────────────────────────────────

pub fn enable(tool_id: &str, tool_dir: &Path) -> Result<(), DanhawkError> {
    let _ = disable(tool_id);
    run_script(tool_dir, "enable", true)
}

pub fn disable(tool_id: &str) -> Result<(), DanhawkError> {
    let pid_path = paths::pid_file(tool_id);
    if pid_path.exists() {
        if let Ok(s) = fs::read_to_string(&pid_path) {
            if let Ok(pid) = s.trim().parse::<u32>() {
                kill_pid(pid);
            }
        }
        let _ = fs::remove_file(&pid_path);
    }

    {
        let mut map = RUNNING.lock().unwrap();
        if let Some(mut child) = map.remove(tool_id) {
            kill_pid(child.id());
            let _ = child.kill();
            let _ = child.wait();
        }
    }

    let tool_dir = paths::installed_tool_dir(tool_id);
    if tool_dir.exists() {
        let _ = run_script(&tool_dir, "disable", false);
    }

    logger::info(&format!("[engine] disabled: {}", tool_id));
    Ok(())
}

pub fn install(tool_id: &str, tool_dir: &Path) -> Result<(), DanhawkError> {
    run_script(tool_dir, "install", false)
}

pub fn uninstall(tool_id: &str, tool_dir: &Path) -> Result<(), DanhawkError> {
    let _ = disable(tool_id);
    run_script(tool_dir, "uninstall", false)
}

/// Opens the tool's GUI window or triggers its "open" behaviour.
/// Does NOT change enabled/disabled state — tool decides what "open" means.
pub fn open(_tool_id: &str, tool_dir: &Path) -> Result<(), DanhawkError> {
    run_script(tool_dir, "open", false)
}

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
        logger::info(&format!("[engine] stopped (quit): {} PID {}", id, pid));
    }
}

pub fn is_running(tool_id: &str) -> bool {
    RUNNING.lock().unwrap().contains_key(tool_id)
}