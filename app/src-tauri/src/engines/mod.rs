pub mod ahk;
pub mod command;
pub mod native;

use std::path::Path;
use crate::core::error::DanhawkError;

/// Route start to the correct engine by manifest engine field.
pub fn start(engine: &str, mod_id: &str, entry_path: &Path) -> Result<(), DanhawkError> {
    match engine {
        "command" => command::start(mod_id, entry_path),
        "ahk"     => ahk::start(mod_id, entry_path),
        "native"  => native::start(mod_id, entry_path),
        other => Err(DanhawkError::Engine(format!(
            "unknown engine '{}' for mod '{}'", other, mod_id
        ))),
    }
}

/// Route stop to the correct engine.
pub fn stop(engine: &str, mod_id: &str) -> Result<(), DanhawkError> {
    match engine {
        "command" => command::stop(mod_id),
        "ahk"     => ahk::stop(mod_id),
        "native"  => native::stop(mod_id),
        other => Err(DanhawkError::Engine(format!(
            "unknown engine '{}' for mod '{}'", other, mod_id
        ))),
    }
}

/// Stop all running extensions across all engines — called on app quit.
pub fn stop_all() {
    command::stop_all();
    ahk::stop_all();
    // native::stop_all() — add when native engine is implemented
}