$ErrorActionPreference = 'Stop'

$workerDir = 'C:\Users\Quatermaster'
$logDir = 'C:\Users\Quatermaster\homelab\logs'
$logFile = Join-Path $logDir 'cursor-agent-worker.log'

if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$existing = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'cursor-agent.*worker' }

if ($existing) {
    "$(Get-Date -Format o) worker already running (pid=$($existing.ProcessId -join ','))" | Out-File -FilePath $logFile -Append -Encoding utf8
    exit 0
}

Set-Location $workerDir
"$(Get-Date -Format o) starting agent worker in $workerDir" | Out-File -FilePath $logFile -Append -Encoding utf8

$agent = Get-Command agent -ErrorAction Stop
& $agent.Source worker --worker-dir $workerDir --name Quatermaster start *>> $logFile
