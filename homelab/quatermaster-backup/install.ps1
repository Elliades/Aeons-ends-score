<#
.SYNOPSIS
  Install Quatermaster backup agent + daily scheduled task.

.EXAMPLE
  .\install.ps1
  Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File C:\workspace\quatermaster-backup\install.ps1'
#>
[CmdletBinding()]
param(
    [int]$Port = 3097,
    [string]$Root = '',
    [string]$AgentTask = 'QuatermasterBackup-Agent',
    [string]$DailyTask = 'QuatermasterBackup-Daily',
    [string]$DailyTime = '03:30'
)

$ErrorActionPreference = 'Stop'
if (-not $Root) {
    $Root = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
}
$agent = Join-Path $Root 'backup-agent.ps1'
$backup = Join-Path $Root 'backup-all.ps1'
if (-not (Test-Path $agent)) { throw "Missing $agent" }
if (-not (Test-Path $backup)) { throw "Missing $backup" }

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
    IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
$userId = if ($env:USERDOMAIN -and $env:USERNAME) { "$env:USERDOMAIN\$env:USERNAME" } else { $env:USERNAME }

function Try-RegisterTask {
    param($Name, $Argument, $Triggers)
    Unregister-ScheduledTask -TaskName $Name -Confirm:$false -ErrorAction SilentlyContinue
    cmd /c "schtasks /Delete /TN `"$Name`" /F >nul 2>&1" | Out-Null
    $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $Argument
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -ExecutionTimeLimit (New-TimeSpan -Hours 4) `
        -RestartCount 3 `
        -RestartInterval (New-TimeSpan -Minutes 1)
    $principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited
    try {
        Register-ScheduledTask -TaskName $Name -Action $action -Trigger $Triggers -Settings $settings -Principal $principal -Force -ErrorAction Stop | Out-Null
        Write-Host "Task registered: $Name" -ForegroundColor Green
        return $true
    } catch {
        Write-Host ("Task skipped ($Name): {0}" -f $_.Exception.Message) -ForegroundColor Yellow
        return $false
    }
}

$agentArgs = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$agent`" -Port $Port -Root `"$Root`""
$dailyArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$backup`" -Root `"$Root`""

$agentOk = Try-RegisterTask -Name $AgentTask -Argument $agentArgs -Triggers (New-ScheduledTaskTrigger -AtLogOn)
$dailyOk = Try-RegisterTask -Name $DailyTask -Argument $dailyArgs -Triggers (New-ScheduledTaskTrigger -Daily -At $DailyTime)

# Startup shortcut fallback (no admin)
$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'QuatermasterBackup-Agent.lnk'
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($shortcutPath)
$sc.TargetPath = 'powershell.exe'
$sc.Arguments = $agentArgs
$sc.WorkingDirectory = $Root
$sc.WindowStyle = 7
$sc.Description = 'Quatermaster AI/Story backup agent'
$sc.Save()
Write-Host "Startup shortcut: $shortcutPath" -ForegroundColor Green

# Daily via Startup-adjacent? Prefer schtasks cmdline fallback
if (-not $dailyOk) {
    $tr = "ST@$DailyTime /SC DAILY"
    $create = "schtasks /Create /TN `"$DailyTask`" /TR `"powershell.exe $dailyArgs`" /SC DAILY /ST $DailyTime /F /RL LIMITED"
    cmd /c $create
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Daily task via schtasks: $DailyTask at $DailyTime" -ForegroundColor Green
        $dailyOk = $true
    } else {
        Write-Host "Could not register daily task. Run backup manually or re-run install elevated." -ForegroundColor Yellow
        Write-Host "  powershell -File `"$backup`" -Root `"$Root`"" -ForegroundColor Yellow
    }
}

if ($isAdmin) {
    netsh advfirewall firewall delete rule name="QuatermasterBackup-$Port" | Out-Null
    netsh advfirewall firewall add rule name="QuatermasterBackup-$Port" dir=in action=allow protocol=TCP localport=$Port profile=any | Out-Null
    Write-Host "Firewall rule added for port $Port" -ForegroundColor Green
} else {
    Write-Host "Not elevated - skip firewall rule. Re-run elevated if LAN/Tailscale probes fail." -ForegroundColor Yellow
}

Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -match 'backup-agent\.ps1' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoProfile', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass',
    '-File', $agent, '-Port', "$Port", '-Root', $Root
) -WindowStyle Hidden

Start-Sleep -Seconds 2
try {
    $h = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/health" -TimeoutSec 5
    Write-Host ("Agent health: {0}" -f $h.status) -ForegroundColor Green
} catch {
    Write-Host ("Agent started but health probe failed: {0}" -f $_.Exception.Message) -ForegroundColor Yellow
}

Write-Host ""
Write-Host "UI:     http://127.0.0.1:$Port" -ForegroundColor Cyan
Write-Host "Health: http://100.127.245.112:$Port/api/health" -ForegroundColor Cyan
Write-Host "NAS:    /mnt/HD/HD_c2/apps-backups/quatermaster/" -ForegroundColor Cyan
if ($dailyOk) { Write-Host "Daily:  $DailyTask at $DailyTime" -ForegroundColor Cyan }
