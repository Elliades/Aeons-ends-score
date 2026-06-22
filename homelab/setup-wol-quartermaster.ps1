<#
.SYNOPSIS
  Configure Wake-on-LAN on Quatermaster (run as Administrator).

.DESCRIPTION
  Enables magic-packet wake on the primary Ethernet adapter, allows the NIC
  to wake the PC, disables Fast Startup (breaks WOL on many boards), and
  verifies wake_armed status.

.EXAMPLE
  # Right-click PowerShell -> Run as Administrator, then:
  .\setup-wol-quartermaster.ps1
#>
#Requires -RunAsAdministrator
[CmdletBinding()]
param(
    [string]$AdapterName = 'Ethernet',
    [string]$MacAddress = '18-C0-4D-A9-10-3A'
)

$ErrorActionPreference = 'Stop'

Write-Host "=== Wake-on-LAN setup for Quatermaster ===" -ForegroundColor Cyan

$adapter = Get-NetAdapter -Name $AdapterName -ErrorAction Stop
Write-Host "Adapter: $($adapter.Name) ($($adapter.MacAddress))" -ForegroundColor Green

$wolProps = @(
    @{ Name = 'Wake on magic packet when system is in the S0ix power state'; Value = 'Activé' },
    @{ Name = 'Réveil sur Magic Packet'; Value = 'Activé' },
    @{ Name = 'Wake on magic packet when system is in the S0ix power state'; Value = 'Enabled' },
    @{ Name = 'Wake on Magic Packet'; Value = 'Enabled' }
)

foreach ($prop in $wolProps) {
    try {
        Set-NetAdapterAdvancedProperty -Name $AdapterName -DisplayName $prop.Name -DisplayValue $prop.Value -ErrorAction Stop
        Write-Host "  OK: $($prop.Name) -> $($prop.Value)" -ForegroundColor DarkGreen
    } catch {
        Write-Host "  Skip: $($prop.Name) ($($_.Exception.Message))" -ForegroundColor Yellow
    }
}

try {
    Set-NetAdapterPowerManagement -Name $AdapterName -WakeOnMagicPacket Enabled -ErrorAction Stop
    Write-Host "  OK: WakeOnMagicPacket power management" -ForegroundColor DarkGreen
} catch {
    Write-Host "  Skip: WakeOnMagicPacket ($($_.Exception.Message))" -ForegroundColor Yellow
}

# Disable Fast Startup (hybrid shutdown keeps NIC partially off)
$fastStartup = 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power'
Set-ItemProperty -Path $fastStartup -Name HiberbootEnabled -Value 0 -Type DWord
Write-Host "  OK: Fast Startup disabled (HiberbootEnabled=0)" -ForegroundColor DarkGreen

# Enable wake for the Realtek adapter via powercfg
$wakeDevices = powercfg /devicequery wake_armed
if ($wakeDevices -match 'Realtek') {
    Write-Host "  OK: Realtek adapter is wake-armed" -ForegroundColor DarkGreen
} else {
    $all = powercfg /devicequery wake_programmable
    $realtek = $all | Where-Object { $_ -match 'Realtek' } | Select-Object -First 1
    if ($realtek) {
        powercfg /deviceenablewake $realtek.Trim()
        Write-Host "  OK: Enabled wake for $realtek" -ForegroundColor DarkGreen
    }
}

Write-Host ""
Write-Host "WOL target:" -ForegroundColor Cyan
Write-Host "  MAC:       $MacAddress"
Write-Host "  Broadcast: 192.168.1.255"
Write-Host ""
Write-Host "BIOS: ensure Wake-on-LAN / ErP+ disabled as needed." -ForegroundColor Yellow
Write-Host "Test: shut down (not sleep), then use http://apps:3087" -ForegroundColor Yellow
