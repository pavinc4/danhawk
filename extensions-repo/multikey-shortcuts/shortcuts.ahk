; shortcuts.ahk — DanHawk: Multikey Shortcuts
;
; Sequential two-key chords:
;   Ctrl+Shift+W  → I  →  Wikipedia
;   Ctrl+Shift+N  → O  →  Notepad
;   Ctrl+Alt+C    → H  →  ChatGPT
;   Ctrl+Alt+C    → O  →  Copilot

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

^+w::
{
    ArmChord("csw", "Ctrl+Shift+W  →  I: Wikipedia")
}

^+n::
{
    ArmChord("csn", "Ctrl+Shift+N  →  O: Notepad")
}

^!c::
{
    ArmChord("cac", "Ctrl+Alt+C  →  H: ChatGPT   O: Copilot")
}

; ── Second key handlers ───────────────────────────────────────────────────────

~i::
{
    global activeChord
    if (activeChord != "csw")
        return
    Disarm()
    Run "https://www.wikipedia.org"
}

~o::
{
    global activeChord
    if (activeChord = "csn") {
        Disarm()
        Run "notepad.exe"
        return
    }
    if (activeChord = "cac") {
        Disarm()
        Run "https://copilot.microsoft.com"
        return
    }
}

~h::
{
    global activeChord
    if (activeChord != "cac")
        return
    Disarm()
    Run "https://chatgpt.com"
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
