<#
.SYNOPSIS
  Install Quatermaster local power agent (sleep/hibernate HTTP API).

.DESCRIPTION
  Registers a logon scheduled task that keeps pc-power-agent.ps1 running,
  opens firewall port 3089 when elevated, and starts the agent immediately.

.EXAMPLE
  .\install-pc-power-agent.ps1
  # Elevated (recommended once):
  Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File C:\Users\Quatermaster\homelab\install-pc-power-agent.ps1'
#>
[CmdletBinding()]
param(
    [int]$Port = 3089,
    [string]$TaskName = 'PcPowerAgent-Quatermaster',
    [string]$AgentScript = 'C:\Users\Quatermaster\homelab\wake-quartermaster\pc-power-agent.ps1',
    [string]$Token = $(if ($env:POWER_TOKEN) { $env:POWER_TOKEN } else { '' })
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $AgentScript)) {
    throw "Missing agent script: $AgentScript"
}

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
    IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

$argLine = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$AgentScript`" -Port $Port"
if ($Token) {
    $argLine += " -Token `"$Token`""
}

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
cmd /c "schtasks /Delete /TN `"$TaskName`" /F >nul 2>&1" | Out-Null

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argLine
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -StartWhenAvailable

$userId = if ($env:USERDOMAIN -and $env:USERNAME) { "$env:USERDOMAIN\$env:USERNAME" } else { $env:USERNAME }
if ($isAdmin) {
    $principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Highest
} else {
    $principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited
}

$taskOk = $false
try {
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force -ErrorAction Stop | Out-Null
    Write-Host "Task registered: $TaskName" -ForegroundColor Green
    $taskOk = $true
} catch {
    Write-Host ("Scheduled task skipped: {0}" -f $_.Exception.Message) -ForegroundColor Yellow
    $taskOk = $false
}

# Fallback: Startup folder shortcut (no admin / no task scheduler rights needed)
$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'PcPowerAgent-Quatermaster.lnk'
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($shortcutPath)
$sc.TargetPath = 'powershell.exe'
$sc.Arguments = $argLine
$sc.WorkingDirectory = Split-Path $AgentScript -Parent
$sc.WindowStyle = 7
$sc.Description = 'Quatermaster sleep/hibernate HTTP agent'
$sc.Save()
Write-Host "Startup shortcut: $shortcutPath" -ForegroundColor Green
if (-not $taskOk) {
    Write-Host 'Using Startup shortcut for persistence.' -ForegroundColor Yellow
}

if ($isAdmin) {
    netsh advfirewall firewall delete rule name="PcPowerAgent-$Port" | Out-Null
    netsh advfirewall firewall add rule name="PcPowerAgent-$Port" dir=in action=allow protocol=TCP localport=$Port profile=any | Out-Null
    Write-Host "Firewall rule allowed TCP $Port" -ForegroundColor DarkGreen
} else {
    Write-Host "Skipped firewall rule (not admin). Re-run elevated if apps cannot reach :$Port" -ForegroundColor Yellow
}

Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -match 'pc-power-agent\.ps1' } |
    ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }

$agentArgs = @(
    '-NoProfile', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass',
    '-File', $AgentScript, '-Port', "$Port"
)
if ($Token) { $agentArgs += @('-Token', $Token) }
Start-Process -FilePath 'powershell.exe' -ArgumentList $agentArgs -WindowStyle Hidden

Start-Sleep -Seconds 2
try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 3
    Write-Host ("Agent healthy: {0}" -f ($health | ConvertTo-Json -Compress)) -ForegroundColor Green
} catch {
    Write-Host ("Agent started but local health check failed: {0}" -f $_.Exception.Message) -ForegroundColor Yellow
}

Write-Host ""
Write-Host ("Sleep API:  POST http://192.168.1.158:{0}/sleep" -f $Port) -ForegroundColor Cyan
Write-Host ("Status API: GET  http://192.168.1.158:{0}/status" -f $Port) -ForegroundColor Cyan
Write-Host 'UI on apps: http://apps:3087/  (Sleep button)' -ForegroundColor Cyan
