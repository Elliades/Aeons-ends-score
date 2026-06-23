$ErrorActionPreference = 'Stop'

$startupDir = [Environment]::GetFolderPath('Startup')
$workerScript = 'C:\Users\Quatermaster\homelab\start-cursor-agent-worker.ps1'
$shortcutPath = Join-Path $startupDir 'Cursor Agent Worker.lnk'

if (-not (Test-Path $workerScript)) {
    throw "Missing worker script: $workerScript"
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = 'powershell.exe'
$shortcut.Arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$workerScript`""
$shortcut.WorkingDirectory = 'C:\Users\Quatermaster'
$shortcut.WindowStyle = 7
$shortcut.Description = 'Start Cursor Cloud Agent worker (My Machines)'
$shortcut.Save()

Write-Host "Startup shortcut created: $shortcutPath" -ForegroundColor Green

Start-Process powershell -ArgumentList "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$workerScript`"" -WindowStyle Hidden
Write-Host "Worker started." -ForegroundColor Cyan
