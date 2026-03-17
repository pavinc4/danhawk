; shortcuts.ahk — DanHawk: Multikey Shortcuts (auto-generated, do not edit manually)
; Edit shortcuts via the Manage Shortcuts button in the Danhawk app.
#Requires AutoHotkey v2.0
#SingleInstance Force

; Write PID file so DanHawk can kill this process on toggle-off
pidDir := A_AppData "\..\Local\Danhawk\pids"
if !DirExist(pidDir)
    DirCreate(pidDir)
FileOpen(pidDir "\multikey-shortcuts.pid", "w").Write(ProcessExist())

; State — which chord is currently armed
global activeChord := ""

ArmChord(chord, hint) {
    global activeChord
    activeChord := chord
    ToolTip(hint, , , 1)
    SetTimer(Disarm, -2000)
}

Disarm() {
    global activeChord
    activeChord := ""
    ToolTip("", , , 1)
}
; ── Chord triggers ────────────────────────────────────────────────────────────

<^<!y::
{
    ArmChord("ctrlalty", "Ctrl+Alt+Y  -  T: YT")
}

; ── Second key handlers ───────────────────────────────────────────────────────

~t::
{
    global activeChord
    if (activeChord = "ctrlalty") {
        Disarm()
        Run "https://youtube.com"
        return
    }
}

; ── Cancel sequence on these keys ─────────────────────────────────────────────

~Escape::
{
    Disarm()
}

~Space::
{
    Disarm()
}

~Enter::
{
    Disarm()
}

Persistent
