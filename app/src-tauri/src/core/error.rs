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
            DanhawkError::Io(e)              => write!(f, "IO error: {}", e),
            DanhawkError::Engine(msg)        => write!(f, "Engine error: {}", msg),
            DanhawkError::NotFound(id)       => write!(f, "Tool not found: {}", id),
            DanhawkError::AlreadyRunning(id) => write!(f, "Tool already running: {}", id),
        }
    }
}

impl From<std::io::Error> for DanhawkError {
    fn from(e: std::io::Error) -> Self {
        DanhawkError::Io(e)
    }
}

impl From<DanhawkError> for String {
    fn from(e: DanhawkError) -> Self {
        e.to_string()
    }
}
