use std::fs::OpenOptions;
use std::io::Write;

use super::paths::logs_dir;

pub fn log(level: &str, msg: &str) {
    let line = format!("[{}] [{}] {}", timestamp(), level, msg);
    println!("{}", line);
    write_to_file(&line);
}

pub fn info(msg: &str)  { log("INFO",  msg); }
pub fn warn(msg: &str)  { log("WARN",  msg); }
pub fn error(msg: &str) { log("ERROR", msg); }

fn timestamp() -> String {
    // Simple timestamp without external crates
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format!("{}", secs)
}

fn write_to_file(line: &str) {
    let path = logs_dir().join("danhawk.log");
    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&path) {
        let _ = writeln!(f, "{}", line);
    }
}
