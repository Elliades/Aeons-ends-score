const express = require('express');
const wol = require('wake_on_lan');
const path = require('path');

const PORT = Number(process.env.PORT || 3087);
const MAC = process.env.WOL_MAC || '18:C0:4D:A9:10:3A';
const BROADCAST = process.env.WOL_BROADCAST || '192.168.1.255';
const HOST_NAME = process.env.WOL_HOST_NAME || 'Quatermaster';
const WAKE_TOKEN = process.env.WAKE_TOKEN || '';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function sendMagicPacket() {
  return new Promise((resolve, reject) => {
    wol.wake(MAC, { address: BROADCAST }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, host: HOST_NAME, mac: MAC });
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
    await sendMagicPacket();
    res.json({ ok: true, message: `Magic packet sent to ${HOST_NAME}` });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`wake-quartermaster listening on :${PORT} -> ${HOST_NAME} (${MAC}) via ${BROADCAST}`);
});
