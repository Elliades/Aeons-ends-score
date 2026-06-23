param(
    [int]$Port = 3088,
    [string]$ScriptPath = 'C:\paas\send-wol.ps1'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $ScriptPath)) {
    throw "Missing WOL script: $ScriptPath"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://+:$Port/")
$listener.Start()
Write-Host "WOL helper listening on http://+:$Port/"

while ($listener.IsListening) {
    $context = $listener.GetContext()
    try {
        $path = $context.Request.Url.AbsolutePath.TrimEnd('/')
        if ($path -eq '/wake' -or $path -eq '/api/wake') {
            $output = & $ScriptPath 2>&1 | Out-String
            $body = @{ ok = $true; source = 'windows'; output = $output.Trim() } | ConvertTo-Json -Compress
            $bytes = [Text.Encoding]::UTF8.GetBytes($body)
            $context.Response.StatusCode = 200
            $context.Response.ContentType = 'application/json'
            $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        } elseif ($path -eq '/health' -or $path -eq '/api/health') {
            $body = '{"ok":true,"source":"windows-wol-helper"}'
            $bytes = [Text.Encoding]::UTF8.GetBytes($body)
            $context.Response.StatusCode = 200
            $context.Response.ContentType = 'application/json'
            $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $context.Response.StatusCode = 404
        }
    } catch {
        $body = (@{ ok = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress)
        $bytes = [Text.Encoding]::UTF8.GetBytes($body)
        $context.Response.StatusCode = 500
        $context.Response.ContentType = 'application/json'
        $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } finally {
        $context.Response.Close()
    }
}
