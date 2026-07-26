<#
.SYNOPSIS
  Local power agent on Quatermaster: sleep / hibernate / status over HTTP.

.DESCRIPTION
  1) Listens on TCP (default 3089) for direct sleep commands from the LAN.
  2) Polls apps wake-quartermaster (/api/agent/poll) so sleep still works
     when Windows Firewall blocks inbound connections.

.EXAMPLE
  .\pc-power-agent.ps1
  .\pc-power-agent.ps1 -Port 3089 -PollUrl http://apps:3087/api/agent/poll
#>
[CmdletBinding()]
param(
    [int]$Port = 3089,
    [string]$Token = $(if ($env:POWER_TOKEN) { $env:POWER_TOKEN } else { '' }),
    [string]$BindAddress = '0.0.0.0',
    [string]$PollUrl = $(if ($env:POWER_POLL_URL) { $env:POWER_POLL_URL } else { 'http://apps:3087/api/agent/poll' }),
    [int]$PollSeconds = 3
)

$ErrorActionPreference = 'Stop'

function Send-HttpResponse {
    param(
        [Parameter(Mandatory)] $Client,
        [int]$StatusCode = 200,
        [string]$StatusText = 'OK',
        [string]$Body = '{}',
        [string]$ContentType = 'application/json; charset=utf-8'
    )

    $bytes = [Text.Encoding]::UTF8.GetBytes($Body)
    $header = "HTTP/1.1 $StatusCode $StatusText`r`nContent-Type: $ContentType`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`nAccess-Control-Allow-Origin: *`r`nAccess-Control-Allow-Headers: Content-Type, X-Wake-Token, X-Power-Token`r`nAccess-Control-Allow-Methods: GET, POST, OPTIONS`r`n`r`n"
    $headerBytes = [Text.Encoding]::ASCII.GetBytes($header)
    $stream = $Client.GetStream()
    $stream.Write($headerBytes, 0, $headerBytes.Length)
    if ($bytes.Length -gt 0) {
        $stream.Write($bytes, 0, $bytes.Length)
    }
    $stream.Flush()
}

function Test-Authorized {
    param([hashtable]$Headers, [string]$BodyText)

    if (-not $Token) { return $true }

    $headerToken = $Headers['x-power-token']
    if (-not $headerToken) { $headerToken = $Headers['x-wake-token'] }
    if ($headerToken -eq $Token) { return $true }

    if ($BodyText -match '"token"\s*:\s*"([^"]+)"') {
        if ($Matches[1] -eq $Token) { return $true }
    }

    return $false
}

function Invoke-SleepNow {
    Add-Type -AssemblyName System.Windows.Forms
    [void][System.Windows.Forms.Application]::SetSuspendState(
        [System.Windows.Forms.PowerState]::Suspend,
        $false,
        $false
    )
}

function Invoke-HibernateNow {
    Add-Type -AssemblyName System.Windows.Forms
    [void][System.Windows.Forms.Application]::SetSuspendState(
        [System.Windows.Forms.PowerState]::Hibernate,
        $false,
        $false
    )
}

function Get-HostStatus {
    $adapter = Get-NetAdapter -Name 'Ethernet' -ErrorAction SilentlyContinue
    $wol = @()
    if ($adapter) {
        $wol = @(
            Get-NetAdapterAdvancedProperty -Name 'Ethernet' -ErrorAction SilentlyContinue |
                Where-Object { $_.DisplayName -match 'Magic Packet|R.veil sur Magic|WoL /' } |
                ForEach-Object { @{ name = $_.DisplayName; value = $_.DisplayValue } }
        )
    }

    $ipAddr = $null
    try {
        $ipAddr = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Ethernet' -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress
    } catch { }

    return @{
        ok          = $true
        host        = $env:COMPUTERNAME
        awake       = $true
        time        = (Get-Date).ToString('o')
        ip          = $ipAddr
        mac         = if ($adapter) { $adapter.MacAddress } else { $null }
        sleepStates = @('S3', 'Hibernate')
        wol         = $wol
        pollUrl     = $PollUrl
    }
}

function Invoke-PowerAction {
    param([ValidateSet('sleep', 'hibernate')] [string]$Action)

    Write-Host ("Applying action: {0}" -f $Action) -ForegroundColor Cyan
    Start-Sleep -Milliseconds 300
    if ($Action -eq 'hibernate') { Invoke-HibernateNow } else { Invoke-SleepNow }
}

function Get-PendingActionFromApps {
    try {
        $headers = @{}
        if ($Token) {
            $headers['X-Power-Token'] = $Token
            $headers['X-Wake-Token'] = $Token
        }
        $response = Invoke-RestMethod -Uri $PollUrl -Method Post -Headers $headers -TimeoutSec 5 -Body '{}' -ContentType 'application/json'
        if ($response.action -eq 'sleep' -or $response.action -eq 'hibernate') {
            return [string]$response.action
        }
    } catch {
        # apps may be briefly unreachable; keep polling
    }
    return $null
}

$ip = [System.Net.IPAddress]::Parse($BindAddress)
$listener = [System.Net.Sockets.TcpListener]::new($ip, $Port)
try {
    $listener.Start()
} catch {
    $msg = $_.Exception.Message
    throw ("Cannot bind {0}:{1} - {2}" -f $BindAddress, $Port, $msg)
}

Write-Host ("pc-power-agent listening on http://{0}:{1}/" -f $BindAddress, $Port) -ForegroundColor Green
Write-Host ("Polling apps for queued sleep: {0}" -f $PollUrl) -ForegroundColor DarkGreen
if ($Token) {
    Write-Host 'Token auth enabled (X-Power-Token / X-Wake-Token)' -ForegroundColor DarkGreen
}

$listener.Server.ReceiveTimeout = 1000
$nextPoll = [datetime]::UtcNow

while ($true) {
    # Outbound poll path (works without inbound firewall)
    if ([datetime]::UtcNow -ge $nextPoll) {
        $queued = Get-PendingActionFromApps
        if ($queued) {
            Invoke-PowerAction -Action $queued
        }
        $nextPoll = [datetime]::UtcNow.AddSeconds($PollSeconds)
    }

    if (-not $listener.Pending()) {
        Start-Sleep -Milliseconds 200
        continue
    }

    $client = $null
    try {
        $client = $listener.AcceptTcpClient()
        $client.ReceiveTimeout = 10000
        $stream = $client.GetStream()
        $buffer = New-Object byte[] 8192
        $read = $stream.Read($buffer, 0, $buffer.Length)
        if ($read -le 0) { continue }

        $raw = [Text.Encoding]::UTF8.GetString($buffer, 0, $read)
        $lines = $raw -split "`r`n"
        $requestLine = $lines[0]
        if ($requestLine -notmatch '^(GET|POST|OPTIONS)\s+(\S+)\s+HTTP/') {
            Send-HttpResponse -Client $client -StatusCode 400 -StatusText 'Bad Request' -Body '{"ok":false,"error":"Bad request"}'
            continue
        }

        $method = $Matches[1]
        $rawPath = $Matches[2]
        if ($rawPath -match '^([^?]*)') { $rawPath = $Matches[1] }
        $path = $rawPath.TrimEnd('/')
        if (-not $path) { $path = '/' }

        $headers = @{}
        for ($i = 1; $i -lt $lines.Length; $i++) {
            if ($lines[$i] -eq '') { break }
            if ($lines[$i] -match '^([^:]+):\s*(.*)$') {
                $headers[$Matches[1].Trim().ToLowerInvariant()] = $Matches[2].Trim()
            }
        }

        $bodyStart = $raw.IndexOf("`r`n`r`n")
        $bodyText = if ($bodyStart -ge 0) { $raw.Substring($bodyStart + 4) } else { '' }

        if ($method -eq 'OPTIONS') {
            Send-HttpResponse -Client $client -StatusCode 204 -StatusText 'No Content' -Body ''
            continue
        }

        if ($path -eq '/health' -or $path -eq '/api/health') {
            $payload = @{ ok = $true; service = 'pc-power-agent'; host = $env:COMPUTERNAME; pollUrl = $PollUrl } | ConvertTo-Json -Compress
            Send-HttpResponse -Client $client -Body $payload
            continue
        }

        if ($path -eq '/status' -or $path -eq '/api/status') {
            $payload = Get-HostStatus | ConvertTo-Json -Compress -Depth 5
            Send-HttpResponse -Client $client -Body $payload
            continue
        }

        if ($method -eq 'POST' -and ($path -eq '/sleep' -or $path -eq '/api/sleep' -or $path -eq '/hibernate' -or $path -eq '/api/hibernate')) {
            if (-not (Test-Authorized -Headers $headers -BodyText $bodyText)) {
                Send-HttpResponse -Client $client -StatusCode 401 -StatusText 'Unauthorized' -Body '{"ok":false,"error":"Invalid token"}'
                continue
            }

            $action = if ($path -match 'hibernate') { 'hibernate' } else { 'sleep' }
            $ack = @{
                ok = $true
                action = $action
                host = $env:COMPUTERNAME
                message = ("Entering {0}" -f $action)
            } | ConvertTo-Json -Compress
            Send-HttpResponse -Client $client -Body $ack
            $client.Close()
            $client = $null
            Invoke-PowerAction -Action $action
            continue
        }

        Send-HttpResponse -Client $client -StatusCode 404 -StatusText 'Not Found' -Body '{"ok":false,"error":"Not found"}'
    } catch {
        if ($client) {
            try {
                $err = (@{ ok = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress)
                Send-HttpResponse -Client $client -StatusCode 500 -StatusText 'Internal Server Error' -Body $err
            } catch { }
        }
        Write-Host ("Agent error: {0}" -f $_.Exception.Message) -ForegroundColor Yellow
    } finally {
        if ($client) {
            try { $client.Close() } catch { }
        }
    }
}
