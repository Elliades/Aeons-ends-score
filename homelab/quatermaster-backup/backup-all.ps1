<#
.SYNOPSIS
  Backup Quatermaster AI/Story durable data -> Q-NAS Volume_3.

.DESCRIPTION
  Archives RisuAI (Story save), Story content, Open WebUI, SillyTavern, Covas
  and uploads via SFTP (nas-sftp :2222) to /mnt/HD/HD_c2/apps-backups/quatermaster.

.EXAMPLE
  .\backup-all.ps1
  .\backup-all.ps1 -SkipUpload
  .\backup-all.ps1 -Only risuai,story-content
#>
[CmdletBinding()]
param(
    [string]$Root = '',
    [string]$Only = '',
    [switch]$SkipUpload,
    [switch]$NoPauseDocker
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

if (-not $Root) {
    $Root = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
}
if (-not $Root) { throw 'Cannot resolve script root' }

$targetsFile = Join-Path $Root 'targets.json'
$cfg = Get-Content -Raw -Encoding UTF8 $targetsFile | ConvertFrom-Json
$staging = Join-Path $Root 'staging'
$statusDir = Join-Path $Root 'status'
$logDir = Join-Path $statusDir 'logs'
New-Item -ItemType Directory -Force -Path $staging, $statusDir, $logDir | Out-Null

$runId = Get-Date -Format 'yyyyMMdd-HHmmss'
$logFile = Join-Path $logDir "run-$runId.log"
$startedAt = (Get-Date).ToUniversalTime().ToString('o')

function Write-Log([string]$Message) {
    $line = "[backup $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
    Add-Content -Path $logFile -Value $line -Encoding UTF8
    Write-Host $line
}

function Invoke-NasSsh([string]$RemoteCommand) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $out = & ssh -o BatchMode=yes -o ConnectTimeout=20 nas-sftp $RemoteCommand 2>&1
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($code -ne 0) {
        throw "ssh nas-sftp failed ($code): $RemoteCommand :: $($out -join ' ')"
    }
    return $out
}

function Send-NasFile([string]$LocalFile, [string]$RemoteDir) {
    $attempt = 0
    $lastErr = $null
    while ($attempt -lt 3) {
        $attempt++
        try {
            Invoke-NasSsh "mkdir -p $RemoteDir" | Out-Null
            $leaf = Split-Path $LocalFile -Leaf
            & scp -o BatchMode=yes -o ConnectTimeout=20 -q $LocalFile "nas-sftp:${RemoteDir}/$leaf"
            if ($LASTEXITCODE -ne 0) { throw "scp exit $LASTEXITCODE" }
            return
        } catch {
            $lastErr = $_
            Write-Log "WARN upload attempt $attempt failed: $_"
            Start-Sleep -Seconds (2 * $attempt)
        }
    }
    throw "upload failed after retries: $lastErr"
}

function Stop-DockerSafe([string[]]$Names) {
    foreach ($n in $Names) {
        $running = docker inspect -f '{{.State.Running}}' $n 2>$null
        if ($running -eq 'true') {
            Write-Log "Pausing docker $n for consistent copy"
            docker stop --time 15 $n | Out-Null
        }
    }
}

function Start-DockerSafe([string[]]$Names) {
    foreach ($n in $Names) {
        $exists = docker inspect -f '{{.Id}}' $n 2>$null
        if ($exists) {
            Write-Log "Starting docker $n"
            docker start $n | Out-Null
        }
    }
}

function New-TargetArchive {
    param($Target)

    $id = $Target.id
    $work = Join-Path $staging $id
    if (Test-Path $work) { Remove-Item -Recurse -Force $work }
    New-Item -ItemType Directory -Force -Path $work | Out-Null

    $copied = 0
    foreach ($p in @($Target.paths)) {
        if (-not (Test-Path -LiteralPath $p)) {
            Write-Log "WARN $id - missing path $p"
            continue
        }
        $item = Get-Item -LiteralPath $p
        $destName = $item.Name
        $dest = Join-Path $work $destName
        if ($item.PSIsContainer) {
            $exclude = @()
            if ($Target.exclude) { $exclude = @($Target.exclude) }
            # robocopy for dirs (handles long paths / many files)
            $null = New-Item -ItemType Directory -Force -Path $dest
            $rcArgs = @($item.FullName, $dest, '/E', '/R:1', '/W:1', '/NFL', '/NDL', '/NJH', '/NJS', '/nc', '/ns', '/np')
            foreach ($ex in $exclude) {
                $rcArgs += '/XD'; $rcArgs += $ex
            }
            & robocopy @rcArgs | Out-Null
            # robocopy exit 0-7 = success-ish
            if ($LASTEXITCODE -ge 8) { throw "robocopy failed for $($item.FullName) code=$LASTEXITCODE" }
            $copied++
        } else {
            Copy-Item -LiteralPath $item.FullName -Destination $dest -Force
            $copied++
        }
    }

    if ($copied -eq 0) {
        return @{ ok = $false; detail = 'no_paths'; file = $null; bytes = 0 }
    }

    $outDir = Join-Path $staging 'archives'
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null
    $archive = Join-Path $outDir "$id-$runId.tar.gz"
    if (Test-Path $archive) { Remove-Item -Force $archive }

    Push-Location $work
    try {
        & tar -czf $archive *
        if ($LASTEXITCODE -ne 0) { throw "tar failed for $id" }
    } finally {
        Pop-Location
    }

    $bytes = (Get-Item $archive).Length
    if ($bytes -lt 64) {
        return @{ ok = $false; detail = 'empty_archive'; file = $null; bytes = 0 }
    }

    Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue
    return @{ ok = $true; detail = 'ok'; file = $archive; bytes = $bytes }
}

$filter = @()
if ($Only) { $filter = $Only.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ } }

$results = @()
$okCount = 0
$failCount = 0

Write-Log "=== quatermaster backup run $runId start ==="

foreach ($t in $cfg.targets) {
    if ($filter.Count -gt 0 -and $filter -notcontains $t.id) { continue }

    $paused = @()
    try {
        if (-not $NoPauseDocker -and $t.pauseDocker) {
            $paused = @($t.pauseDocker)
            Stop-DockerSafe $paused
        }

        Write-Log "Archiving $($t.id) ($($t.service))"
        $arch = New-TargetArchive -Target $t
        if (-not $arch.ok) {
            $failCount++
            $results += [pscustomobject]@{ id = $t.id; ok = $false; detail = $arch.detail; bytes = 0; file = $null }
            Write-Log "FAIL $($t.id) - $($arch.detail)"
            continue
        }

        if (-not $SkipUpload) {
            $remote = "$($cfg.nas.remoteRoot)/$($t.id)"
            Send-NasFile -LocalFile $arch.file -RemoteDir $remote
            # prune remote (busybox find -mtime)
            try {
                Invoke-NasSsh "find '$remote' -type f -mtime +$($cfg.keepRemote) -delete 2>/dev/null || true"
            } catch {
                Write-Log "WARN prune remote $($t.id): $_"
            }
            Write-Log "Uploaded $(Split-Path $arch.file -Leaf) -> nas:$remote/"
        }

        $okCount++
        $results += [pscustomobject]@{
            id     = $t.id
            ok     = $true
            detail = 'ok'
            bytes  = $arch.bytes
            file   = (Split-Path $arch.file -Leaf)
        }
        Write-Log ("OK {0} ({1:N1} MB)" -f $t.id, ($arch.bytes / 1MB))
    } catch {
        $failCount++
        $results += [pscustomobject]@{ id = $t.id; ok = $false; detail = "$_"; bytes = 0; file = $null }
        Write-Log "FAIL $($t.id) - $_"
    } finally {
        if ($paused.Count -gt 0) { Start-DockerSafe $paused }
    }
}

# prune local archives
$archRoot = Join-Path $staging 'archives'
if (Test-Path $archRoot) {
    Get-ChildItem $archRoot -File | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-[int]$cfg.keepLocal) } | Remove-Item -Force -ErrorAction SilentlyContinue
}
Get-ChildItem $logDir -Filter 'run-*.log' | Sort-Object LastWriteTime -Descending | Select-Object -Skip 30 | Remove-Item -Force -ErrorAction SilentlyContinue

$finishedAt = (Get-Date).ToUniversalTime().ToString('o')
$status = if ($failCount -eq 0 -and $okCount -gt 0) { 'ok' } elseif ($okCount -gt 0) { 'degraded' } else { 'down' }

$nasDf = ''
try {
    if (-not $SkipUpload) {
        $nasDf = (& ssh -o BatchMode=yes nas-sftp "df -P '$($cfg.nas.remoteRoot)' | tail -1" 2>$null) -join ' '
    }
} catch { }

$lastRun = [ordered]@{
    runId      = $runId
    status     = $status
    startedAt  = $startedAt
    finishedAt = $finishedAt
    ok         = $okCount
    failed     = $failCount
    host       = $env:COMPUTERNAME
    targets    = @($results | ForEach-Object {
        [ordered]@{
            id     = $_.id
            ok     = [bool]$_.ok
            detail = [string]$_.detail
            bytes  = [int64]$_.bytes
            file   = $_.file
        }
    })
    nas        = [ordered]@{
        sshHost    = $cfg.nas.sshHost
        remoteRoot = $cfg.nas.remoteRoot
        df         = $nasDf
    }
    log        = "logs/run-$runId.log"
}

$lastRun | ConvertTo-Json -Depth 6 | Set-Content -Path (Join-Path $statusDir 'last-run.json') -Encoding UTF8
$results | ForEach-Object {
    $_ | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $statusDir "$($_.id).json") -Encoding UTF8
}

Write-Log "=== quatermaster backup run $runId done status=$status ok=$okCount fail=$failCount ==="
if ($failCount -gt 0 -and $okCount -eq 0) { exit 1 }
exit 0
