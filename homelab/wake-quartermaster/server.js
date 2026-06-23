const express = require('express');
const dgram = require('dgram');
const http = require('http');
const path = require('path');

const PORT = Number(process.env.PORT || 3087);
const MAC = (process.env.WOL_MAC || '18:C0:4D:A9:10:3A').toUpperCase();
const BROADCAST = process.env.WOL_BROADCAST || '192.168.1.255';
const UNICAST = process.env.WOL_UNICAST || '192.168.1.158';
const HOST_NAME = process.env.WOL_HOST_NAME || 'Quatermaster';
const WAKE_TOKEN = process.env.WAKE_TOKEN || '';
const PACKET_COUNT = Number(process.env.WOL_PACKET_COUNT || 5);
const WINDOWS_WOL_URL = process.env.WINDOWS_WOL_URL || 'http://172.22.48.1:3088/wake';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function buildMagicPacket(macAddress) {
  const mac = macAddress.replace(/[^0-9A-F]/gi, '');
  if (mac.length !== 12) {
    throw new Error(`Invalid MAC address: ${macAddress}`);
  }

  const header = Buffer.alloc(6, 0xff);
  const body = Buffer.alloc(16 * 6);
  for (let i = 0; i < 16; i += 1) {
    for (let j = 0; j < 6; j += 1) {
      body[i * 6 + j] = Number.parseInt(mac.slice(j * 2, j * 2 + 2), 16);
    }
  }
  return Buffer.concat([header, body]);
}

function sendUdpMagicPacket(target, udpPort) {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    const packet = buildMagicPacket(MAC);

    socket.once('error', (error) => {
      socket.close();
      reject(error);
    });

    socket.bind(() => {
      socket.setBroadcast(true);
      socket.send(packet, udpPort, target, (error) => {
        socket.close();
        if (error) reject(error);
        else resolve({ target, port: udpPort });
      });
    });
  });
}

async function sendFromNode() {
  const targets = [...new Set([BROADCAST, UNICAST, '255.255.255.255'])];
  const ports = [9, 7];
  const sent = [];

  for (let attempt = 0; attempt < PACKET_COUNT; attempt += 1) {
    for (const target of targets) {
      for (const udpPort of ports) {
        sent.push(await sendUdpMagicPacket(target, udpPort));
      }
    }
    if (attempt < PACKET_COUNT - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return sent;
}

async function sendFromWindowsHost() {
  return new Promise((resolve) => {
    const request = http.request(WINDOWS_WOL_URL, { method: 'POST', timeout: 10000 }, (response) => {
      let body = '';
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        try {
          resolve({ ok: response.statusCode >= 200 && response.statusCode < 300, body: JSON.parse(body) });
        } catch {
          resolve({ ok: response.statusCode >= 200 && response.statusCode < 300, body });
        }
      });
    });

    request.on('timeout', () => {
      request.destroy();
      resolve({ ok: false, error: 'Windows WOL helper timeout' });
    });

    request.on('error', (error) => {
      resolve({ ok: false, error: error.message });
    });

    request.end();
  });
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    host: HOST_NAME,
    mac: MAC,
    broadcast: BROADCAST,
    unicast: UNICAST,
    packetCount: PACKET_COUNT,
  });
});

app.post('/api/wake', async (req, res) => {
  if (WAKE_TOKEN) {
    const token = req.headers['x-wake-token'] || req.body?.token;
    if (token !== WAKE_TOKEN) {
      res.status(401).json({ ok: false, error: 'Invalid token' });
      return;
    }
  }

  try {
    const nodeSent = await sendFromNode();
    const windowsSent = await sendFromWindowsHost();

    res.json({
      ok: true,
      message: `Magic packets sent to ${HOST_NAME}`,
      nodePackets: nodeSent.length,
      windowsFallback: windowsSent,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(
    `wake-quartermaster listening on :${PORT} -> ${HOST_NAME} (${MAC}) targets=${BROADCAST},${UNICAST}`,
  );
});
