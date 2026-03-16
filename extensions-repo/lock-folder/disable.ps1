# on_disable hook — runs when toggle is turned OFF
# Removes registry key so Explorer context menu disappears instantly

Remove-Item -Path "HKCU:\Software\Classes\Directory\shell\DanhawkFolderTools" -Recurse -Force -ErrorAction SilentlyContinue
