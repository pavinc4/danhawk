// Native engine — placeholder.
// When implemented, this will spawn compiled .exe tools (Rust / C++).
//
// Example future usage:
//   Command::new(entry_path)
//       .creation_flags(0x08000000) // CREATE_NO_WINDOW
//       .spawn()

use crate::core::error::DanhawkError;

pub fn start(mod_id: &str, _entry_path: &std::path::Path) -> Result<(), DanhawkError> {
    Err(DanhawkError::Engine(format!(
        "Native engine not yet implemented for mod '{}'",
        mod_id
    )))
}

pub fn stop(_mod_id: &str) -> Result<(), DanhawkError> {
    Ok(())
}

pub fn is_running(_mod_id: &str) -> bool {
    false
}
