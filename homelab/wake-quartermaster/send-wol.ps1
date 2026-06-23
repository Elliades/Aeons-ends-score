param(
    [string]$MacAddress = '18:C0:4D:A9:10:3A',
    [string]$Broadcast = '192.168.1.255',
    [string]$Unicast = '192.168.1.158',
    [int]$PacketCount = 5
)

$mac = ($MacAddress -replace '[:-]', '').ToUpper()
if ($mac.Length -ne 12) {
    throw "Invalid MAC address: $MacAddress"
}

$packet = [byte[]](,0xFF * 6)
for ($i = 0; $i -lt 16; $i++) {
    for ($j = 0; $j -lt 6; $j++) {
        $packet += [byte]('0x' + $mac.Substring($j * 2, 2))
    }
}

$targets = @($Broadcast, $Unicast, '255.255.255.255') | Select-Object -Unique
$ports = @(9, 7)
$sent = 0

foreach ($attempt in 1..$PacketCount) {
    foreach ($target in $targets) {
        foreach ($port in $ports) {
            $udp = New-Object System.Net.Sockets.UdpClient
            try {
                $udp.Connect($target, $port)
                [void]$udp.Send($packet, $packet.Length)
                $sent++
            } finally {
                $udp.Close()
            }
        }
    }
    Start-Sleep -Milliseconds 200
}

Write-Output "sent=$sent targets=$($targets -join ',')"
