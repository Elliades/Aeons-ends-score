const express = require('express');
const dgram = require('dgram');
const http = require('http');
const net = require('net');
const path = require('path');

const PORT = Number(process.env.PORT || 3087);
const MAC = (process.env.WOL_MAC || '18:C0:4D:A9:10:3A').toUpperCase();
const BROADCAST = process.env.WOL_BROADCAST || '192.168.1.255';
const UNICAST = process.env.WOL_UNICAST || '192.168.1.158';
const HOST_NAME = process.env.WOL_HOST_NAME || 'Quatermaster';
const WAKE_TOKEN = process.env.WAKE_TOKEN || '';
const PACKET_COUNT = Number(process.env.WOL_PACKET_COUNT || 5);
const WINDOWS_WOL_URL = process.env.WINDOWS_WOL_URL || 'http://172.22.48.1:3088/wake';
const SLEEP_AGENT_URL = (process.env.SLEEP_AGENT_URL || `http://${UNICAST}:3089`).replace(/\/$/, '');
const STATUS_TIMEOUT_MS = Number(process.env.STATUS_TIMEOUT_MS || 2500);
const PENDING_TTL_MS = Number(process.env.PENDING_TTL_MS || 120000);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/** @type {{ mode: 'sleep' | 'hibernate', requestedAt: number } | null} */
let pendingPowerAction = null;

function requireToken(req, res) {
  if (!WAKE_TOKEN) return true;
  const token = req.headers['x-wake-token'] || req.headers['x-power-token'] || req.body?.token;
  if (token !== WAKE_TOKEN) {
    res.status(401).json({ ok: false, error: 'Invalid token' });
    return false;
  }
  return true;
}

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

function httpJson(url, { method = 'GET', headers = {}, body, timeoutMs = 10000 } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const request = http.request(url, { method, headers, timeout: timeoutMs }, (response) => {
      let raw = '';
      response.on('data', (chunk) => { raw += chunk; });
      response.on('end', () => {
        let parsed = raw;
        try { parsed = JSON.parse(raw); } catch { /* keep text */ }
        finish({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          statusCode: response.statusCode,
          body: parsed,
        });
      });
    });

    request.on('timeout', () => {
      request.destroy();
      finish({ ok: false, error: `Timeout calling ${url}` });
    });

    request.on('error', (error) => {
      finish({ ok: false, error: error.message });
    });

    if (body) request.write(body);
    request.end();
  });
}

async function sendFromWindowsHost() {
  return httpJson(WINDOWS_WOL_URL, { method: 'POST', timeoutMs: 10000 });
}

function tcpReachable(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

function queuePowerAction(mode) {
  pendingPowerAction = { mode, requestedAt: Date.now() };
}

function claimPendingAction() {
  if (!pendingPowerAction) return null;
  if (Date.now() - pendingPowerAction.requestedAt > PENDING_TTL_MS) {
    pendingPowerAction = null;
    return null;
  }
  const job = pendingPowerAction;
  pendingPowerAction = null;
  return job;
}

async function probeHost() {
  const agent = await httpJson(`${SLEEP_AGENT_URL}/status`, { timeoutMs: STATUS_TIMEOUT_MS });
  if (agent.ok) {
    return {
      awake: true,
      source: 'power-agent',
      agent: agent.body,
      pendingAction: pendingPowerAction,
    };
  }

  const reachable = await tcpReachable(UNICAST, 3389, STATUS_TIMEOUT_MS)
    || await tcpReachable(UNICAST, 445, STATUS_TIMEOUT_MS)
    || await tcpReachable(UNICAST, 3089, STATUS_TIMEOUT_MS);

  return {
    awake: reachable,
    source: reachable ? 'tcp-probe' : 'unreachable',
    agentError: agent.error || agent.body,
    pendingAction: pendingPowerAction,
  };
}

async function requestPowerAction(mode) {
  queuePowerAction(mode);

  const headers = { 'Content-Type': 'application/json' };
  if (WAKE_TOKEN) {
    headers['X-Power-Token'] = WAKE_TOKEN;
    headers['X-Wake-Token'] = WAKE_TOKEN;
  }

  const direct = await httpJson(`${SLEEP_AGENT_URL}/${mode}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ token: WAKE_TOKEN || undefined }),
    timeoutMs: 4000,
  });

  if (direct.ok) {
    pendingPowerAction = null;
    return {
      ok: true,
      delivery: 'direct',
      message: `${HOST_NAME} is going to ${mode}`,
      agent: direct.body,
    };
  }

  return {
    ok: true,
    delivery: 'queued',
    message: `${HOST_NAME} ${mode} queued - local agent will apply it within a few seconds`,
    tip: 'Keep pc-power-agent running on Quatermaster (Startup shortcut / install-pc-power-agent.ps1).',
    directError: direct.error || direct.body,
  };
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    host: HOST_NAME,
    mac: MAC,
    broadcast: BROADCAST,
    unicast: UNICAST,
    packetCount: PACKET_COUNT,
    sleepAgentUrl: SLEEP_AGENT_URL,
    pendingAction: pendingPowerAction,
    features: ['wake', 'sleep', 'hibernate', 'status', 'agent-poll'],
  });
});

app.get('/api/status', async (_req, res) => {
  try {
    const status = await probeHost();
    res.json({
      ok: true,
      host: HOST_NAME,
      mac: MAC,
      unicast: UNICAST,
      ...status,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/wake', async (req, res) => {
  if (!requireToken(req, res)) return;

  try {
    const nodeSent = await sendFromNode();
    const windowsSent = await sendFromWindowsHost();

    res.json({
      ok: true,
      message: `Magic packets sent to ${HOST_NAME}`,
      nodePackets: nodeSent.length,
      windowsFallback: windowsSent,
      tip: 'If the PC stays off: run setup-wol-quartermaster.ps1 as Admin (set WoL link speed to Pas vitesse ralentie) and enable Wake-on-LAN / disable ErP in BIOS.',
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/sleep', async (req, res) => {
  if (!requireToken(req, res)) return;
  res.json(await requestPowerAction('sleep'));
});

app.post('/api/hibernate', async (req, res) => {
  if (!requireToken(req, res)) return;
  res.json(await requestPowerAction('hibernate'));
});

// Local agent on Quatermaster polls this (outbound) so sleep works without inbound firewall.
app.post('/api/agent/poll', (req, res) => {
  if (!requireToken(req, res)) return;
  const job = claimPendingAction();
  res.json({
    ok: true,
    action: job ? job.mode : null,
    requestedAt: job ? job.requestedAt : null,
  });
});

app.get('/api/agent/poll', (req, res) => {
  if (!requireToken(req, res)) return;
  const job = claimPendingAction();
  res.json({
    ok: true,
    action: job ? job.mode : null,
    requestedAt: job ? job.requestedAt : null,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(
    `wake-quartermaster listening on :${PORT} -> ${HOST_NAME} (${MAC}) `
    + `wake targets=${BROADCAST},${UNICAST} sleepAgent=${SLEEP_AGENT_URL}`,
  );
});
