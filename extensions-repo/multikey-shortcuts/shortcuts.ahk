; shortcuts.ahk — DanHawk: Multikey Shortcuts (auto-generated)
; Edit via Manage Shortcuts in the Danhawk app.
#Requires AutoHotkey v2.0
#SingleInstance Force

pidDir := A_AppData "\..\Local\Danhawk\pids"
if !DirExist(pidDir)
    DirCreate(pidDir)
FileOpen(pidDir "\multikey-shortcuts.pid", "w").Write(ProcessExist())

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
; -- Chord triggers

<^<!y::
{
    ArmChord("ctrlalty", "Ctrl+Alt+Y  ->  T: YT")
}

<^<!b::
{
    ArmChord("ctrlaltb", "Ctrl+Alt+B  ->  R: Brave")
}

; -- Second key handlers

~t::
{
    global activeChord
    if (activeChord = "ctrlalty") {
        Disarm()
        Run "https://youtube.com"
        return
    }
}

~r::
{
    global activeChord
    if (activeChord = "ctrlaltb") {
        Disarm()
        Run "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
        return
    }
}

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
