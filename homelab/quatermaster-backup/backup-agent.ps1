<#
.SYNOPSIS
  HTTP agent for Quatermaster AI/Story backups (health + manual trigger).

.EXAMPLE
  .\backup-agent.ps1
  .\backup-agent.ps1 -Port 3097
#>
[CmdletBinding()]
param(
    [int]$Port = 3097,
    [string]$BindAddress = '0.0.0.0',
    [string]$Root = ''
)

$ErrorActionPreference = 'Stop'
if (-not $Root) {
    $Root = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
}
$script:LastTrigger = $null
$script:StartedAt = Get-Date
$backupScript = Join-Path $Root 'backup-all.ps1'
$statusDir = Join-Path $Root 'status'
New-Item -ItemType Directory -Force -Path $statusDir | Out-Null
$runningFlag = Join-Path $statusDir 'backup-running.flag'
if (-not (Test-Path $runningFlag)) {
    Set-Content -Path $runningFlag -Value '0' -Encoding ascii
}

function Read-JsonFile([string]$Path) {
    if (-not (Test-Path $Path)) { return $null }
    try { return (Get-Content -Raw -Encoding UTF8 $Path | ConvertFrom-Json) } catch { return $null }
}

function Test-BackupRunning {
    if (Test-Path $runningFlag) {
        return ((Get-Content -Raw $runningFlag).Trim() -eq '1')
    }
    return $false
}

function Get-Health {
    $last = Read-JsonFile (Join-Path $statusDir 'last-run.json')
    $ageH = $null
    if ($last -and $last.finishedAt) {
        try {
            $finishedUtc = [DateTimeOffset]::Parse([string]$last.finishedAt).UtcDateTime
            $ageH = ((Get-Date).ToUniversalTime() - $finishedUtc).TotalHours
        } catch { $ageH = $null }
    }

    $lastOk = $false
    if ($last -and $last.status -eq 'ok' -and $null -ne $ageH -and $ageH -le 36) { $lastOk = $true }
    $lastStatus = if (-not $last) { 'down' } elseif ($lastOk) { 'ok' } else { 'down' }

    $nasKey = Test-Path (Join-Path $env:USERPROFILE '.ssh\id_nas_ed25519')
    $checks = [ordered]@{
        frontend   = @{ status = 'ok' }
        backend    = @{ status = 'ok' }
        storage    = @{ status = $(if (Test-Path $Root) { 'ok' } else { 'down' }); detail = $Root }
        nasKey     = @{ status = $(if ($nasKey) { 'ok' } else { 'down' }); detail = 'id_nas_ed25519' }
        lastBackup = @{
            status     = $lastStatus
            detail     = $(if ($last) { "$($last.status); ageHours=$([math]::Round([double]$ageH, 1)); ok=$($last.ok) fail=$($last.failed)" } else { 'no run yet' })
            finishedAt = $(if ($last) { $last.finishedAt } else { $null })
        }
    }

    $required = @('frontend', 'backend', 'storage', 'nasKey')
    if ($last -or ((Get-Date) - $script:StartedAt).TotalHours -gt 1) { $required += 'lastBackup' }

    $down = @($required | Where-Object { $checks[$_].status -eq 'down' })
    $status = 'ok'
    if ($down.Count -gt 0) { $status = 'degraded' }
    if ($last -and $last.status -eq 'degraded' -and $status -eq 'ok') { $status = 'degraded' }

    return [ordered]@{
        status        = $status
        service       = 'quatermaster-backup'
        timestamp     = (Get-Date).ToUniversalTime().ToString('o')
        uptime        = [math]::Round(((Get-Date) - $script:StartedAt).TotalSeconds, 1)
        host          = $env:COMPUTERNAME
        checks        = $checks
        lastRun       = $last
        backupRunning = (Test-BackupRunning)
        lastTrigger   = $script:LastTrigger
    }
}

function Send-HttpResponse {
    param($Client, [int]$Code = 200, [string]$Text = 'OK', [string]$Body = '{}', [string]$ContentType = 'application/json; charset=utf-8')
    $bytes = [Text.Encoding]::UTF8.GetBytes($Body)
    $header = "HTTP/1.1 $Code $Text`r`nContent-Type: $ContentType`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`nAccess-Control-Allow-Origin: *`r`nAccess-Control-Allow-Methods: GET, POST, OPTIONS`r`nAccess-Control-Allow-Headers: Content-Type`r`n`r`n"
    $stream = $Client.GetStream()
    $hb = [Text.Encoding]::ASCII.GetBytes($header)
    $stream.Write($hb, 0, $hb.Length)
    if ($bytes.Length -gt 0) { $stream.Write($bytes, 0, $bytes.Length) }
    $stream.Flush()
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse($BindAddress), $Port)
$listener.Start()
Write-Host "[quatermaster-backup] listening on ${BindAddress}:$Port root=$Root"

while ($true) {
    $client = $null
    try {
        $client = $listener.AcceptTcpClient()
        $client.ReceiveTimeout = 5000
        $stream = $client.GetStream()
        $buffer = New-Object byte[] 8192
        $read = $stream.Read($buffer, 0, $buffer.Length)
        $req = [Text.Encoding]::UTF8.GetString($buffer, 0, [Math]::Max(0, $read))
        $line = ($req -split "`r`n")[0]
        $method = ($line -split ' ')[0]
        $path = (($line -split ' ')[1] -split '\?')[0]

        if ($method -eq 'OPTIONS') {
            Send-HttpResponse -Client $client -Code 204 -Text 'No Content' -Body ''
            continue
        }

        if ($path -eq '/api/health' -or $path -eq '/health') {
            $h = Get-Health
            $code = if ($h.status -eq 'ok') { 200 } else { 503 }
            Send-HttpResponse -Client $client -Code $code -Body ($h | ConvertTo-Json -Depth 8)
            continue
        }

        if ($path -eq '/api/status') {
            Send-HttpResponse -Client $client -Code 200 -Body ((Get-Health) | ConvertTo-Json -Depth 8)
            continue
        }

        if ($path -eq '/api/backup/last') {
            $last = Read-JsonFile (Join-Path $statusDir 'last-run.json')
            if (-not $last) { $last = @{ status = 'none' } }
            Send-HttpResponse -Client $client -Code 200 -Body ($last | ConvertTo-Json -Depth 8)
            continue
        }

        if ($path -eq '/api/backup' -and $method -eq 'POST') {
            if (Test-BackupRunning) {
                Send-HttpResponse -Client $client -Code 409 -Text 'Conflict' -Body '{"ok":false,"error":"backup already running"}'
                continue
            }
            $script:LastTrigger = (Get-Date).ToUniversalTime().ToString('o')
            Set-Content -Path $runningFlag -Value '1' -Encoding ascii
            $proc = Start-Process -FilePath 'powershell.exe' `
                -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $backupScript, '-Root', $Root) `
                -WindowStyle Hidden `
                -RedirectStandardOutput (Join-Path $statusDir 'last-trigger.out.log') `
                -RedirectStandardError (Join-Path $statusDir 'last-trigger.err.log') `
                -PassThru
            Start-Job -ScriptBlock {
                param($PidToWait, $FlagPath)
                Wait-Process -Id $PidToWait -ErrorAction SilentlyContinue
                Set-Content -Path $FlagPath -Value '0' -Encoding ascii
            } -ArgumentList $proc.Id, $runningFlag | Out-Null
            Send-HttpResponse -Client $client -Code 202 -Text 'Accepted' -Body (@{
                ok = $true; message = 'backup started'; triggeredAt = $script:LastTrigger; pid = $proc.Id
            } | ConvertTo-Json)
            continue
        }

        if ($path -eq '/' -or $path -eq '/index.html') {
            $html = @'
<!doctype html><html><head><meta charset=utf-8><title>quatermaster-backup</title>
<style>body{font-family:Segoe UI,sans-serif;background:#121816;color:#e8f0e9;margin:2rem}pre{background:#0003;padding:1rem;overflow:auto}button{padding:.5rem 1rem;margin:.5rem 0}</style></head>
<body><h1>quatermaster-backup</h1><p>Risu / Story / Open WebUI / SillyTavern / Covas -> Q-NAS Volume_3</p>
<button onclick="fetch('/api/backup',{method:'POST'}).then(r=>r.json()).then(j=>alert(JSON.stringify(j)))">Backup now</button>
<pre id=s>loading...</pre>
<script>async function r(){const j=await fetch('/api/status').then(x=>x.json());s.textContent=JSON.stringify(j,null,2)}r();setInterval(r,10000)</script>
</body></html>
'@
            Send-HttpResponse -Client $client -Code 200 -Text 'OK' -Body $html -ContentType 'text/html; charset=utf-8'
            continue
        }

        Send-HttpResponse -Client $client -Code 404 -Text 'Not Found' -Body '{"error":"not found"}'
    } catch {
        Write-Host "[agent] error: $_"
    } finally {
        if ($client) { try { $client.Close() } catch { } }
    }
}
