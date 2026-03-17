// extension_commands.rs
// Generic file read/write + app scanning + icon extraction for extension UIs.

use std::fs;
use std::path::PathBuf;
use crate::core::{logger, paths};

#[cfg(windows)]
use std::os::windows::process::CommandExt;
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

fn safe_ext_path(ext_id: &str, filename: &str) -> Result<PathBuf, String> {
    let base = paths::extensions_dir();
    let target = base.join(ext_id).join(filename);
    let base_canon = fs::canonicalize(&base).unwrap_or(base.clone());
    let parent = target.parent().ok_or("invalid path")?;
    let parent_canon = fs::canonicalize(parent).unwrap_or_else(|_| parent.to_path_buf());
    if !parent_canon.starts_with(&base_canon) {
        return Err(format!("path traversal blocked: {}", target.display()));
    }
    Ok(target)
}

/// Read a text file from an extension's folder.
#[tauri::command]
pub fn ext_read_file(ext_id: String, filename: String) -> Result<String, String> {
    let path = safe_ext_path(&ext_id, &filename)?;
    if !path.exists() { return Ok(String::new()); }
    fs::read_to_string(&path).map_err(|e| {
        logger::warn(&format!("[ext-cmd] read failed {}: {}", path.display(), e));
        e.to_string()
    })
}

/// Write a text file to an extension's folder.
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

/// Scan installed apps from Windows registry — same logic as qkey.
/// Returns fast with no icons. Call load_icon per-app to get icons.
#[tauri::command]
pub async fn scan_apps() -> Result<Vec<serde_json::Value>, String> {
    tauri::async_runtime::spawn_blocking(do_scan_apps)
        .await
        .map_err(|e| e.to_string())?
}

fn do_scan_apps() -> Result<Vec<serde_json::Value>, String> {
    let script = r#"
$apps = [System.Collections.Generic.List[PSCustomObject]]::new()
$seen = @{}
$regPaths = @(
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
)
foreach ($path in $regPaths) {
    try {
        Get-ItemProperty $path -ErrorAction SilentlyContinue |
        Where-Object {
            $_.DisplayName -and $_.UninstallString -and
            $_.SystemComponent -ne 1 -and (-not $_.ParentKeyName) -and
            $_.DisplayName -notmatch '^(KB\d+|Security Update|Hotfix|Update for|Windows.*Update)' -and
            @('Security Update','Update Rollup','Service Pack','Hotfix','Feature Pack','Update','Language Pack') -notcontains $_.ReleaseType
        } | ForEach-Object {
            $exePath = $null
            if ($_.DisplayIcon) {
                $raw = ($_.DisplayIcon -split ',')[0].Trim('"').Trim()
                if ($raw -match '\.(exe|ico)$' -and (Test-Path $raw -ErrorAction SilentlyContinue)) { $exePath = $raw }
            }
            if (-not $exePath -and $_.InstallLocation) {
                $loc = $_.InstallLocation.Trim('"').Trim()
                if ($loc -and (Test-Path $loc -ErrorAction SilentlyContinue)) {
                    $exe = Get-ChildItem -Path $loc -Filter '*.exe' -Depth 1 -ErrorAction SilentlyContinue |
                        Where-Object { $_.Name -notmatch '(uninstall|setup|helper|crash|update|redist|repair)' } |
                        Sort-Object Length -Descending | Select-Object -First 1
                    if ($exe) { $exePath = $exe.FullName }
                }
            }
            if ($exePath) {
                $key = $_.DisplayName.ToLower().Trim()
                if (-not $seen[$key]) {
                    $seen[$key] = $true
                    $apps.Add([PSCustomObject]@{
                        id          = [System.Guid]::NewGuid().ToString()
                        name        = $_.DisplayName.Trim()
                        path        = $exePath
                        publisher   = if ($_.Publisher) { $_.Publisher.Trim() } else { '' }
                        installDate = if ($_.InstallDate) { $_.InstallDate } else { '' }
                    })
                }
            }
        }
    } catch {}
}
$apps | Sort-Object name | ConvertTo-Json -Depth 2 -Compress
"#;

    #[allow(unused_mut)]
    let mut cmd = std::process::Command::new("powershell");
    cmd.args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script]);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output().map_err(|e| format!("PowerShell error: {e}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout);

    if stdout.trim().is_empty() || stdout.trim() == "null" {
        return Ok(vec![]);
    }

    let parsed: Vec<serde_json::Value> = if stdout.trim().starts_with('[') {
        serde_json::from_str(stdout.trim()).unwrap_or_default()
    } else if stdout.trim().starts_with('{') {
        serde_json::from_str(&format!("[{}]", stdout.trim())).unwrap_or_default()
    } else {
        vec![]
    };

    Ok(parsed)
}

/// Extract icon from an exe/ico file as base64 PNG.
/// Returns empty string if extraction fails.
#[tauri::command]
pub async fn load_icon(path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || extract_icon_base64(&path))
        .await
        .map_err(|e| e.to_string())
}

fn extract_icon_base64(exe_path: &str) -> String {
    let safe_path = exe_path.replace('\'', "''");
    let script = format!(
        r#"Add-Type -AssemblyName System.Drawing
try {{
  $ico = [System.Drawing.Icon]::ExtractAssociatedIcon('{safe_path}')
  if ($ico) {{
    $bmp = $ico.ToBitmap()
    $ms  = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    [Convert]::ToBase64String($ms.ToArray())
  }}
}} catch {{}}"#
    );

    #[allow(unused_mut)]
    let mut cmd = std::process::Command::new("powershell");
    cmd.args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", &script]);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let out = match cmd.output() {
        Ok(o) => o,
        Err(_) => return String::new(),
    };

    let b64 = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if b64.len() < 50 { return String::new(); }
    format!("data:image/png;base64,{b64}")
}