# DanHawk

Windows automation extension platform.

## Structure

```
danhawk/
├── app/                  ← Tauri application (platform)
│   ├── src/              ← React + TypeScript frontend
│   ├── src-tauri/        ← Rust backend
│   │   ├── src/
│   │   │   ├── core/     ← error, logger, paths
│   │   │   ├── engines/  ← command, ahk (stub), native (stub)
│   │   │   └── commands/ ← Tauri command handlers
│   │   └── Cargo.toml
│   └── package.json
│
├── extensions-repo/      ← Extension catalog (local dev mirror)
│   └── open-notepad/     ← Test extension (command engine)
│       ├── manifest.json
│       └── run.cmd
│
└── docs/                 ← Architecture notes
```

## Getting started

```bash
cd app
npm install
npm run tauri dev
```

## Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Rust via Tauri 2
- **Engines**: Command (active) · AHK (stub) · Native (stub)

## Adding an extension

1. Create a folder in `extensions-repo/<id>/`
2. Add `manifest.json` with `id`, `name`, `engine`, `entry`, etc.
3. Add the entry file (`.cmd`, `.bat`, `.ps1`, `.ahk`, or `.exe`)
4. Restart the app — it rescans on every launch

No app rebuild needed.
