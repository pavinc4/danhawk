pub mod ahk;
pub mod command;
pub mod native;

use std::path::{Path, PathBuf};
use crate::core::error::DanhawkError;

// ── Lifecycle hook runner ─────────────────────────────────────────────────────
// Runs any file type supported by the command engine.
// Used by both on_enable and on_disable hooks declared in manifest lifecycle.
// Blocks until the hook process finishes — hooks are expected to be fast.

pub fn run_hook(hook_path: &Path) -> Result<(), DanhawkError> {
    command::run_hook(hook_path)
}

// ── Start ─────────────────────────────────────────────────────────────────────
// If the extension declares an on_enable lifecycle hook, run it and return.
// The hook handles everything — no process is spawned or tracked.
// If no hook — fall through to normal engine spawn behavior.

pub fn start(
    engine: &str,
    mod_id: &str,
    entry_path: &Path,
    on_enable: Option<&PathBuf>,
) -> Result<(), DanhawkError> {
    if let Some(hook) = on_enable {
        if hook.exists() {
            crate::core::logger::info(&format!(
                "[lifecycle] on_enable hook for '{}': {}", mod_id, hook.display()
            ));
            return run_hook(hook);
        } else {
            crate::core::logger::warn(&format!(
                "[lifecycle] on_enable hook not found for '{}': {}", mod_id, hook.display()
            ));
        }
    }

    // No lifecycle hook — normal engine behavior (spawn process)
    match engine {
        "command" => command::start(mod_id, entry_path),
        "ahk"     => ahk::start(mod_id, entry_path),
        "native"  => native::start(mod_id, entry_path),
        other => Err(DanhawkError::Engine(format!(
            "unknown engine '{}' for mod '{}'", other, mod_id
        ))),
    }
}

// ── Stop ──────────────────────────────────────────────────────────────────────
// If the extension declares an on_disable lifecycle hook, kill any tracked
// process first (in case entry also ran), then run the hook.
// If no hook — fall through to normal engine kill behavior.

pub fn stop(
    engine: &str,
    mod_id: &str,
    on_disable: Option<&PathBuf>,
) -> Result<(), DanhawkError> {
    if let Some(hook) = on_disable {
        if hook.exists() {
            crate::core::logger::info(&format!(
                "[lifecycle] on_disable hook for '{}': {}", mod_id, hook.display()
            ));
            // Kill any tracked process first — safe even if nothing is running
            let _ = match engine {
                "command" => command::stop(mod_id),
                "ahk"     => ahk::stop(mod_id),
                _         => Ok(()),
            };
            return run_hook(hook);
        } else {
            crate::core::logger::warn(&format!(
                "[lifecycle] on_disable hook not found for '{}': {}", mod_id, hook.display()
            ));
        }
    }

    // No lifecycle hook — normal engine behavior (kill process)
    match engine {
        "command" => command::stop(mod_id),
        "ahk"     => ahk::stop(mod_id),
        "native"  => native::stop(mod_id),
        other => Err(DanhawkError::Engine(format!(
            "unknown engine '{}' for mod '{}'", other, mod_id
        ))),
    }
}

// ── Stop all — clean quit ─────────────────────────────────────────────────────
// Called on app quit. Does not run on_disable hooks intentionally —
// system state cleanup hooks (registry etc) should only fire on explicit toggle OFF,
// not on every app close.

pub fn stop_all() {
    command::stop_all();
    ahk::stop_all();
    native::stop_all();
}