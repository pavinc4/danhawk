# on_enable hook — runs when toggle is turned ON
# Writes registry so Explorer shows Lock/Unlock Folder submenu
# Runs and exits — no need to stay alive, lifecycle hooks are fire-and-done

$scriptDir    = Split-Path -Parent $MyInvocation.MyCommand.Path
$lockScript   = Join-Path $scriptDir "lock.ps1"
$unlockScript = Join-Path $scriptDir "unlock.ps1"
$vbs          = Join-Path $scriptDir "silent.vbs"

$lockCmd   = 'wscript.exe "' + $vbs + '" "' + $lockScript   + '" "%1"'
$unlockCmd = 'wscript.exe "' + $vbs + '" "' + $unlockScript + '" "%1"'

$parent = "HKCU:\Software\Classes\Directory\shell\DanhawkFolderTools"

New-Item -Path $parent -Force | Out-Null
Set-ItemProperty -Path $parent -Name "(Default)"    -Value "Lock/Unlock Folder"
Set-ItemProperty -Path $parent -Name "MUIVerb"      -Value "Lock/Unlock Folder"
Set-ItemProperty -Path $parent -Name "SubCommands"  -Value ""
New-Item -Path "$parent\shell" -Force | Out-Null

$lock = "$parent\shell\Lock"
New-Item -Path $lock -Force | Out-Null
Set-ItemProperty -Path $lock -Name "(Default)" -Value "Lock Folder"
New-Item -Path "$lock\command" -Force | Out-Null
Set-ItemProperty -Path "$lock\command" -Name "(Default)" -Value $lockCmd

$unlock = "$parent\shell\Unlock"
New-Item -Path $unlock -Force | Out-Null
Set-ItemProperty -Path $unlock -Name "(Default)" -Value "Unlock Folder"
New-Item -Path "$unlock\command" -Force | Out-Null
Set-ItemProperty -Path "$unlock\command" -Name "(Default)" -Value $unlockCmd
