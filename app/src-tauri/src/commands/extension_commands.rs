// extension_commands.rs
// Generic file read/write commands scoped to the extensions-repo directory.
// Used by frontend extension UIs to persist their own data (e.g. shortcuts.json).
// Security: all paths are validated to stay inside extensions-repo.

use std::fs;
use std::path::PathBuf;
use crate::core::{logger, paths};

fn safe_ext_path(ext_id: &str, filename: &str) -> Result<PathBuf, String> {
    let base = paths::extensions_dir();
    let target = base.join(ext_id).join(filename);
    // Prevent path traversal — ensure resolved path starts with extensions dir
    let base_canon = fs::canonicalize(&base).unwrap_or(base.clone());
    let parent = target.parent().ok_or("invalid path")?;
    let parent_canon = fs::canonicalize(parent)
        .unwrap_or_else(|_| parent.to_path_buf());
    if !parent_canon.starts_with(&base_canon) {
        return Err(format!("path traversal blocked: {}", target.display()));
    }
    Ok(target)
}

/// Read a text file from an extension's folder.
/// Returns empty string if file doesn't exist.
#[tauri::command]
pub fn ext_read_file(ext_id: String, filename: String) -> Result<String, String> {
    let path = safe_ext_path(&ext_id, &filename)?;
    if !path.exists() {
        return Ok(String::new());
    }
    fs::read_to_string(&path).map_err(|e| {
        logger::warn(&format!("[ext-cmd] read failed {}: {}", path.display(), e));
        e.to_string()
    })
}

/// Write a text file to an extension's folder.
/// Creates the file if it doesn't exist.
#[tauri::command]
pub fn ext_write_file(ext_id: String, filename: String, content: String) -> Result<(), String> {
    let path = safe_ext_path(&ext_id, &filename)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, content).map_err(|e| {
        logger::warn(&format!("[ext-cmd] write failed {}: {}", path.display(), e));
        e.to_string()
    })
}