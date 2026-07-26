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
    # Critical: "10 Mbps en premier" often prevents reliable WOL from sleep/off
    @{ Name = 'WoL / Arrêt vitesse réseau'; Value = 'Pas vitesse ralentie' }
)

foreach ($prop in $props) {
    Set-NicProperty -DisplayName $prop.Name -Value $prop.Value | Out-Null
}

# Verify the critical WOL link-speed setting
$wolSpeed = Get-NetAdapterAdvancedProperty -Name $AdapterName -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -eq 'WoL / Arrêt vitesse réseau' } |
    Select-Object -First 1
if ($wolSpeed) {
    if ($wolSpeed.DisplayValue -eq 'Pas vitesse ralentie') {
        Write-Host "  OK: WoL link speed = Pas vitesse ralentie" -ForegroundColor DarkGreen
    } else {
        Write-Host "  WARN: WoL / Arrêt vitesse réseau = $($wolSpeed.DisplayValue) (want: Pas vitesse ralentie)" -ForegroundColor Yellow
    }
}

# Allow inbound sleep-agent port used by apps UI
try {
    netsh advfirewall firewall delete rule name='PcPowerAgent-3089' | Out-Null
    netsh advfirewall firewall add rule name='PcPowerAgent-3089' dir=in action=allow protocol=TCP localport=3089 profile=any | Out-Null
    Write-Host "  OK: Firewall TCP 3089 (pc-power-agent)" -ForegroundColor DarkGreen
} catch {
    Write-Host "  Skip: firewall 3089 ($($_.Exception.Message))" -ForegroundColor Yellow
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
Write-Host "BIOS (required if wake still fails):" -ForegroundColor Yellow
Write-Host "  1. Enable Wake-on-LAN / PCIE Wake / Power On By PCI-E"
Write-Host "  2. Disable ErP / ERP Ready / Deep Sleep / Ultra Low Power"
Write-Host "  3. Keep +5VSB / standby power on the NIC after shutdown"
Write-Host ""
Write-Host "Also install sleep agent (once):" -ForegroundColor Yellow
Write-Host "  .\homelab\install-pc-power-agent.ps1"
Write-Host ""
Write-Host "Test wake: shutdown /s /t 0  then http://apps:3087" -ForegroundColor Yellow
Write-Host "Test sleep: http://apps:3087  -> Mettre en veille" -ForegroundColor Yellow
