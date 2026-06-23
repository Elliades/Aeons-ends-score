<#
.SYNOPSIS
  Register elevated WOL setup to run once at next logon (admin prompt).

.EXAMPLE
  .\install-wol-setup-task.ps1
#>
[CmdletBinding()]
param(
    [string]$TaskName = 'Setup-WOL-Quatermaster',
    [string]$SetupScript = 'C:\Users\Quatermaster\homelab\setup-wol-quartermaster.ps1'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $SetupScript)) {
    throw "Missing setup script: $SetupScript"
}

$command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$SetupScript`""

cmd /c "schtasks /Delete /TN `"$TaskName`" /F >nul 2>&1"
schtasks /Create /TN $TaskName /TR $command /SC ONLOGON /RL HIGHEST /F

Write-Host "Task registered: $TaskName (RunLevel Highest)" -ForegroundColor Green
Write-Host "A UAC prompt will appear at next logon to finalize WOL settings." -ForegroundColor Yellow
