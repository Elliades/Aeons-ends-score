<#
.SYNOPSIS
  Configure Wake-on-LAN on Quatermaster (run as Administrator).

.EXAMPLE
  # PowerShell en tant qu'administrateur
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

function Set-NicProperty {
    param([string]$DisplayName, [string]$Value)
    try {
        Set-NetAdapterAdvancedProperty -Name $AdapterName -DisplayName $DisplayName -DisplayValue $Value -ErrorAction Stop
        Write-Host "  OK: $DisplayName -> $Value" -ForegroundColor DarkGreen
        return $true
    } catch {
        Write-Host "  Skip: $DisplayName ($($_.Exception.Message))" -ForegroundColor Yellow
        return $false
    }
}

$props = @(
    @{ Name = 'Wake on magic packet when system is in the S0ix power state'; Value = 'Activé' },
    @{ Name = 'Wake on magic packet when system is in the S0ix power state'; Value = 'Enabled' },
    @{ Name = 'Réveil sur Magic Packet'; Value = 'Activé' },
    @{ Name = 'Wake on Magic Packet'; Value = 'Enabled' },
    @{ Name = 'Arrêter Réveil par réseau'; Value = 'Activé' },
    @{ Name = 'WoL / Arrêt vitesse réseau'; Value = 'Pas vitesse ralentie' }
)

foreach ($prop in $props) {
    Set-NicProperty -DisplayName $prop.Name -Value $prop.Value | Out-Null
}

try {
    Set-NetAdapterPowerManagement -Name $AdapterName -WakeOnMagicPacket Enabled -ErrorAction Stop
    Write-Host "  OK: WakeOnMagicPacket power management" -ForegroundColor DarkGreen
} catch {
    Write-Host "  Skip: WakeOnMagicPacket ($($_.Exception.Message))" -ForegroundColor Yellow
}

$fastStartup = 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power'
Set-ItemProperty -Path $fastStartup -Name HiberbootEnabled -Value 0 -Type DWord
Write-Host "  OK: Fast Startup disabled (HiberbootEnabled=0)" -ForegroundColor DarkGreen

$wakeDevices = powercfg /devicequery wake_armed
if ($wakeDevices -match 'Realtek Gaming') {
    Write-Host "  OK: Realtek Gaming adapter is wake-armed" -ForegroundColor DarkGreen
} else {
    $all = powercfg /devicequery wake_programmable
    $realtek = $all | Where-Object { $_ -match 'Realtek Gaming' } | Select-Object -First 1
    if ($realtek) {
        powercfg /deviceenablewake $realtek.Trim()
        Write-Host "  OK: Enabled wake for $realtek" -ForegroundColor DarkGreen
    }
}

# Registry fallback for Realtek NIC class keys
$nicClass = 'HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}'
Get-ChildItem $nicClass -ErrorAction SilentlyContinue | ForEach-Object {
    $desc = (Get-ItemProperty -Path $_.PSPath -Name DriverDesc -ErrorAction SilentlyContinue).DriverDesc
    if ($desc -match 'Realtek Gaming') {
        Set-ItemProperty -Path $_.PSPath -Name '*WakeOnMagicPacket' -Value '1' -Type String -Force
        Set-ItemProperty -Path $_.PSPath -Name 'WakeOnMagicPacket' -Value '1' -Type String -Force
        Set-ItemProperty -Path $_.PSPath -Name 'PnPCapabilities' -Value 24 -Type DWord -Force
        Write-Host "  OK: Registry WOL enabled for $desc" -ForegroundColor DarkGreen
    }
}

Write-Host ""
Write-Host "WOL target:" -ForegroundColor Cyan
Write-Host "  MAC:       $MacAddress"
Write-Host "  Broadcast: 192.168.1.255"
Write-Host "  Unicast:   192.168.1.158"
Write-Host ""
Write-Host "BIOS: active Wake-on-LAN et desactive ErP+ si la carte s'eteint en veille." -ForegroundColor Yellow
Write-Host "Test: arret complet (pas veille), puis http://apps:3087" -ForegroundColor Yellow
