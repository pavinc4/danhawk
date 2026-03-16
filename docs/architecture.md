# DanHawk Architecture

## How the platform works

```
Frontend (React)
      │  invoke()
      ▼
Tauri Bridge
      │
      ▼
commands/
  mods_commands.rs   ← get_mods, install_mod, remove_mod, toggle_mod
  settings_commands.rs
      │
      ▼
engines/
  mod.rs             ← dispatcher — routes by engine string
  command/mod.rs     ← runs .cmd/.bat/.ps1 silently via cmd /C
  ahk/mod.rs         ← stub
  native/mod.rs      ← stub
      │
      ▼
core/
  error.rs           ← DanhawkError type
  logger.rs          ← stdout + file logging
  paths.rs           ← finds extensions-repo/, logs/ dir
```

## Extension lifecycle

1. App starts → `get_mods` called → scans `extensions-repo/` for `manifest.json` files
2. User clicks Install → `install_mod` → marks as installed in registry
3. User toggles Enable → `toggle_mod(id, true)` → engines::start → process spawned
4. User toggles Disable → `toggle_mod(id, false)` → engines::stop → process killed
5. User clicks Uninstall → `remove_mod` → stops if running, marks as uninstalled

## Manifest format

```json
{
  "id": "my-extension",
  "name": "My Extension",
  "version": "1.0.0",
  "author": "You",
  "description": "What it does",
  "engine": "command",
  "entry": "run.cmd",
  "category": "Launcher",
  "icon": "Terminal",
  "icon_color": "#60A5FA",
  "icon_bg": "#0a1a35"
}
```

## Engine types

| Engine    | Entry file       | Status      |
|-----------|------------------|-------------|
| `command` | `.cmd` `.bat` `.ps1` | ✅ Active |
| `ahk`     | `.ahk`           | 🔲 Stub     |
| `native`  | `.exe`           | 🔲 Stub     |

## Adding a new engine

1. Create `src-tauri/src/engines/<name>/mod.rs`
2. Implement `start(mod_id, entry_path)` and `stop(mod_id)`
3. Add a match arm in `engines/mod.rs` dispatcher
4. Declare the module in `engines/mod.rs`

Nothing else changes. The command layer and frontend are unaffected.
