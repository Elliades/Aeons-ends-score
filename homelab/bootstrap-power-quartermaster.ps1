<#
.SYNOPSIS
  One-shot elevated bootstrap: WOL NIC settings + sleep agent + firewall.

.EXAMPLE
  Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File C:\Users\Quatermaster\homelab\bootstrap-power-quartermaster.ps1'
#>
#Requires -RunAsAdministrator
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host '=== 1/2 Wake-on-LAN NIC setup ===' -ForegroundColor Cyan
& (Join-Path $root 'setup-wol-quartermaster.ps1')

Write-Host ''
Write-Host '=== 2/2 Sleep agent install ===' -ForegroundColor Cyan
& (Join-Path $root 'install-pc-power-agent.ps1')

Write-Host ''
Write-Host 'Bootstrap done.' -ForegroundColor Green
Write-Host 'UI: http://apps:3087/' -ForegroundColor Cyan
Write-Host 'If wake still fails after this script: change BIOS (enable WOL, disable ErP).' -ForegroundColor Yellow
