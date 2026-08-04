<#
.SYNOPSIS
  Deploy apps-db-backup — scheduled Postgres/config dumps → Q-NAS Volume_3.

  UI/API: http://apps:3096
  Health: GET /api/health

.EXAMPLE
  ./provision/deploy-apps-db-backup.ps1
  ./provision/deploy-apps-db-backup.ps1 -RunNow
#>
[CmdletBinding()]
param(
    [string]$RemoteHost = $(if ($env:APPS_SSH_HOST) { $env:APPS_SSH_HOST } else { 'ADMIN@apps' }),
    [string]$AppRoot    = $(if ($env:APPS_DB_BACKUP_ROOT) { $env:APPS_DB_BACKUP_ROOT } else { 'c:\workspace\apps-db-backup' }),
    [int]$Port          = 3096,
    [switch]$RunNow
)

$ErrorActionPreference = 'Stop'
$sshOpts = @('-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20')
$remoteDir = 'C:\paas\apps-db-backup'
$appsPs1 = Join-Path $PSScriptRoot 'apps.ps1'

if (-not (Test-Path (Join-Path $AppRoot 'Dockerfile'))) {
    throw "Missing apps-db-backup at $AppRoot"
}

Write-Host "=== 1. Pack and copy to apps ===" -ForegroundColor Green
$tarLocal = Join-Path $env:TEMP ("apps-db-backup-" + [guid]::NewGuid().ToString('N') + '.tar')
Push-Location $AppRoot
try {
    tar -cf $tarLocal --exclude=node_modules --exclude=.git --exclude=.env --exclude=backups .
    if ($LASTEXITCODE -ne 0) { throw 'tar failed' }
} finally { Pop-Location }

& ssh @sshOpts $RemoteHost "if not exist `"$remoteDir`" mkdir `"$remoteDir`""
& ssh @sshOpts $RemoteHost "if not exist C:\paas\tmp mkdir C:\paas\tmp" | Out-Null
$leaf = Split-Path $tarLocal -Leaf
& scp @sshOpts $tarLocal "${RemoteHost}:C:\paas\tmp\$leaf"
Remove-Item $tarLocal -Force

# Ensure NAS key exists on Linux FS (not /mnt/c)
$nasKey = Join-Path $env:USERPROFILE '.ssh\id_nas_ed25519'
if (Test-Path $nasKey) {
    Write-Host "=== 1b. Sync NAS SSH key to /opt/secrets/nas ===" -ForegroundColor Green
    & scp @sshOpts $nasKey "${RemoteHost}:C:\paas\tmp\id_nas_ed25519"
}

$env:APPS_SSH_HOST = $RemoteHost
$runNowBash = if ($RunNow) {
    @"
curl -s -X POST http://127.0.0.1:$Port/api/backup; echo
for i in `$(seq 1 36); do
  sleep 5
  st=`$(curl -s http://127.0.0.1:$Port/api/status)
  running=`$(echo "`$st" | jq -r .backupRunning)
  rid=`$(echo "`$st" | jq -r .lastRun.runId)
  echo "wait=`$((i*5))s running=`$running run=`$rid"
  if [[ "`$running" == "false" && "`$rid" != "null" ]]; then break; fi
done
curl -s http://127.0.0.1:$Port/api/backup/last; echo
"@
} else { 'echo skip_run_now' }

& $appsPs1 -Bash @"
set -euo pipefail
mkdir -p /mnt/c/paas/apps-db-backup /opt/apps-db-backup /opt/secrets/nas
tar -xf /mnt/c/paas/tmp/$leaf -C /mnt/c/paas/apps-db-backup
rm -f /mnt/c/paas/tmp/$leaf
if [[ -f /mnt/c/paas/tmp/id_nas_ed25519 ]]; then
  cp /mnt/c/paas/tmp/id_nas_ed25519 /opt/secrets/nas/id_nas_ed25519
  chmod 600 /opt/secrets/nas/id_nas_ed25519
  chown root:root /opt/secrets/nas/id_nas_ed25519
  rm -f /mnt/c/paas/tmp/id_nas_ed25519
fi
if [[ ! -f /opt/secrets/nas/id_nas_ed25519 ]]; then
  echo "ERROR: missing /opt/secrets/nas/id_nas_ed25519" >&2
  exit 1
fi
rm -rf /opt/apps-db-backup
mkdir -p /opt/apps-db-backup
cp -a /mnt/c/paas/apps-db-backup/. /opt/apps-db-backup/
cd /opt/apps-db-backup
find scripts -type f -name '*.sh' -exec sed -i 's/\r`$//' {} +
sed -i 's/\r`$//' Dockerfile docker-compose.yml crontab targets.yaml server.js 2>/dev/null || true
chmod +x scripts/*.sh
docker compose build
docker compose up -d
docker ps --filter name=apps-db-backup --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
sleep 2
curl -s -o /dev/null -w 'ui=%{http_code}\n' http://127.0.0.1:$Port/
curl -s http://127.0.0.1:$Port/api/health
echo
$runNowBash
"@
if ($LASTEXITCODE -ne 0) { throw 'Deploy failed' }

Write-Host "=== 2. LAN portproxy for $Port ===" -ForegroundColor Green
$proxy = @"
@echo off
for /f "delims=" %%i in ('wsl -d Ubuntu-24.04 -- hostname -I') do set WSLIP=%%i
for /f "tokens=1" %%j in ("%WSLIP%") do set WSLIP=%%j
netsh interface portproxy delete v4tov4 listenport=$Port listenaddress=0.0.0.0 >nul 2>&1
netsh interface portproxy add v4tov4 listenport=$Port listenaddress=0.0.0.0 connectport=$Port connectaddress=%WSLIP%
netsh advfirewall firewall add rule name=App-$Port dir=in action=allow protocol=TCP localport=$Port profile=any >nul 2>&1
netsh interface portproxy show all | findstr $Port
"@
$proxyLocal = Join-Path $env:TEMP 'portproxy-apps-db-backup.cmd'
[IO.File]::WriteAllText($proxyLocal, ($proxy -replace "`n", "`r`n"))
& scp @sshOpts $proxyLocal "${RemoteHost}:C:\paas\tmp\portproxy-apps-db-backup.cmd"
& ssh @sshOpts $RemoteHost "C:\paas\tmp\portproxy-apps-db-backup.cmd"
Remove-Item $proxyLocal -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host "  LAN:       http://apps:$Port"
Write-Host "  Tailscale: http://100.93.92.42:$Port"
Write-Host "  Health:    http://apps:$Port/api/health"
Write-Host "  NAS path:  /mnt/HD/HD_c2/apps-backups"
