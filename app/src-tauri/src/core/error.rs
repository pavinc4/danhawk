use std::fmt;

#[derive(Debug)]
pub enum DanhawkError {
    Io(std::io::Error),
    Engine(String),
    NotFound(String),
    AlreadyRunning(String),
}

impl fmt::Display for DanhawkError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            DanhawkError::Io(e)             => write!(f, "IO error: {}", e),
            DanhawkError::Engine(msg)       => write!(f, "Engine error: {}", msg),
            DanhawkError::NotFound(id)      => write!(f, "Mod not found: {}", id),
            DanhawkError::AlreadyRunning(id)=> write!(f, "Mod already running: {}", id),
        }
    }
}

impl From<std::io::Error> for DanhawkError {
    fn from(e: std::io::Error) -> Self {
        DanhawkError::Io(e)
    }
}

// Convert to String so Tauri commands can return Result<_, String>
impl From<DanhawkError> for String {
    fn from(e: DanhawkError) -> Self {
        e.to_string()
    }
}
