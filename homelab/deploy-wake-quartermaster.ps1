<#
.SYNOPSIS
  Deploy wake-quartermaster WOL webapp to apps (port 3087).

.EXAMPLE
  ./provision/deploy-wake-quartermaster.ps1
#>
[CmdletBinding()]
param(
    [string]$RemoteHost = $(if ($env:APPS_SSH_HOST) { $env:APPS_SSH_HOST } else { 'ADMIN@apps' }),
    [string]$Distro     = 'Ubuntu-24.04',
    [int]$Port          = 3087,
    [string]$ProjectName = 'homelab',
    [string]$ServiceName = 'wake-quartermaster',
    [string]$RemoteDir  = 'C:\paas\wake-quartermaster'
)

$ErrorActionPreference = 'Stop'
$sshOpts = @('-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20')
$appsPs1 = Join-Path $PSScriptRoot 'apps.ps1'
$localApp = (Resolve-Path (Join-Path $PSScriptRoot '..\templates\wake-quartermaster')).Path
$env:APPS_SSH_HOST = $RemoteHost

if (-not (Test-Path $localApp)) { throw "Missing $localApp" }

Write-Host "=== 1. Copy wake-quartermaster to apps ===" -ForegroundColor Green
& ssh @sshOpts $RemoteHost "if exist `"$RemoteDir`" rmdir /s /q `"$RemoteDir`" & mkdir `"$RemoteDir`"" | Out-Null
& scp @sshOpts -r "$localApp\*" "${RemoteHost}:$RemoteDir/"
& scp @sshOpts "$localApp\.env.example" "$localApp\.dockerignore" "${RemoteHost}:$RemoteDir/"

Write-Host "=== 2. docker compose build and up ===" -ForegroundColor Green
$wslDir = '/mnt/c/paas/wake-quartermaster'
$composeBash = @'
set -euo pipefail
cd '__WSL_DIR__'
if [ ! -f .env ]; then touch .env; fi
docker compose down 2>/dev/null || true
docker compose build
docker compose up -d
sleep 3
curl -sf http://127.0.0.1:__PORT__/api/health
'@ -replace '__WSL_DIR__', $wslDir -replace '__PORT__', $Port
& $appsPs1 -Bash $composeBash
if ($LASTEXITCODE -ne 0) { throw 'docker compose failed' }

Write-Host "=== 3. Coolify service (API on apps) ===" -ForegroundColor Green
$deploySh = @'
#!/usr/bin/env bash
set -euo pipefail
PORT=__PORT__
PROJECT_NAME='__PROJECT_NAME__'
SERVICE_NAME='__SERVICE_NAME__'
REMOTE_DIR='__REMOTE_DIR__'

TOKEN=$(docker exec coolify php -r '
require "/var/www/html/vendor/autoload.php";
$app = require_once "/var/www/html/bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$user = App\Models\User::first();
$plain = Illuminate\Support\Str::random(64);
$hash = hash("sha256", $plain);
$access = $user->tokens()->create([
    "name" => "deploy-wake-quartermaster",
    "token" => $hash,
    "abilities" => ["*"],
    "team_id" => 0,
]);
echo $access->id . "|" . $plain;
' | tr -d '\r')

BASE="http://127.0.0.1:8000"
SERVER_UUID=$(docker exec coolify-db psql -U coolify -d coolify -tAc "SELECT uuid FROM servers ORDER BY id LIMIT 1;" | tr -d '[:space:]')
B64=$(base64 -w0 "$REMOTE_DIR/docker-compose.yml")

SERVICE_UUID=$(docker exec coolify-db psql -U coolify -d coolify -tAc \
  "SELECT s.uuid FROM services s JOIN environments e ON e.id = s.environment_id JOIN projects p ON p.id = e.project_id WHERE s.name = '$SERVICE_NAME' AND p.name = '$PROJECT_NAME' LIMIT 1;" \
  | tr -d '[:space:]')

if [ -n "${SERVICE_UUID:-}" ]; then
  HTTP=$(curl -sS -o /tmp/coolify-wqm.json -w "%{http_code}" -X PATCH "$BASE/api/v1/services/$SERVICE_UUID" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"docker_compose_raw\":\"$B64\",\"instant_deploy\":true}")
else
  PROJECT_UUID=$(docker exec coolify-db psql -U coolify -d coolify -tAc "SELECT uuid FROM projects WHERE name = '$PROJECT_NAME' LIMIT 1;" | tr -d '[:space:]')
  if [ -z "${PROJECT_UUID:-}" ]; then
    PROJECT_UUID=$(curl -sS -X POST "$BASE/api/v1/projects" \
      -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
      -d "{\"name\":\"$PROJECT_NAME\",\"description\":\"Homelab apps\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['uuid'])")
    echo "Created project: $PROJECT_UUID"
  fi
  HTTP=$(curl -sS -o /tmp/coolify-wqm.json -w "%{http_code}" -X POST "$BASE/api/v1/services" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"name\":\"$SERVICE_NAME\",\"description\":\"Wake-on-LAN for Quatermaster\",\"project_uuid\":\"$PROJECT_UUID\",\"server_uuid\":\"$SERVER_UUID\",\"environment_name\":\"production\",\"docker_compose_raw\":\"$B64\",\"instant_deploy\":true}")
fi
echo "Coolify API -> HTTP $HTTP"
cat /tmp/coolify-wqm.json
echo ""
curl -sS -o /dev/null -w "health_http=%{http_code}\n" "http://127.0.0.1:${PORT}/api/health" || true
'@ -replace '__PORT__', $Port `
     -replace '__PROJECT_NAME__', $ProjectName `
     -replace '__SERVICE_NAME__', $ServiceName `
     -replace '__REMOTE_DIR__', $wslDir

$tmpLocal = Join-Path $env:TEMP "deploy-wake-quartermaster-$(New-Guid).sh"
[System.IO.File]::WriteAllText($tmpLocal, ($deploySh -replace "`r`n", "`n"), (New-Object System.Text.UTF8Encoding $false))
$tmpRemote = 'C:\paas\tmp\deploy-wake-quartermaster.sh'
& ssh @sshOpts $RemoteHost "if not exist C:\paas\tmp mkdir C:\paas\tmp" | Out-Null
& scp @sshOpts $tmpLocal "${RemoteHost}:$tmpRemote"
Remove-Item $tmpLocal -Force
& $appsPs1 -Bash "bash /mnt/c/paas/tmp/deploy-wake-quartermaster.sh"

Write-Host "=== 4. LAN portproxy ($Port) ===" -ForegroundColor Green
$proxyCmd = @"
@echo off
for /f "delims=" %%i in ('wsl -d $Distro -- hostname -I') do set WSLIP=%%i
for /f "tokens=1" %%j in ("%WSLIP%") do set WSLIP=%%j
for %%P in (8000 6001 6002 3080 3081 3082 3083 3084 3085 3086 3087) do (
  netsh interface portproxy delete v4tov4 listenport=%%P listenaddress=0.0.0.0 >nul 2>&1
  netsh interface portproxy add v4tov4 listenport=%%P listenaddress=0.0.0.0 connectport=%%P connectaddress=%WSLIP%
)
netsh advfirewall firewall add rule name=App-$Port dir=in action=allow protocol=TCP localport=$Port profile=any
"@
$proxyLocal = Join-Path $env:TEMP 'portproxy-wqm.cmd'
Set-Content -Path $proxyLocal -Value $proxyCmd -Encoding ascii
& scp @sshOpts $proxyLocal "${RemoteHost}:C:\paas\tmp\portproxy-wqm.cmd"
& ssh @sshOpts $RemoteHost "C:\paas\tmp\portproxy-wqm.cmd"
Remove-Item $proxyLocal -Force

Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host "  LAN:       http://apps:$Port/"
Write-Host "  Tailscale: http://100.93.92.42:$Port/"
Write-Host "  Health:    http://apps:$Port/api/health"
