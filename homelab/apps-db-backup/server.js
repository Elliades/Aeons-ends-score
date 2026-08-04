'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = Number(process.env.PORT || 3096);
const STATUS_DIR = process.env.STATUS_DIR || '/data/status';
const BACKUP_ROOT = process.env.BACKUP_ROOT || '/data/backups';
const TARGETS_FILE = process.env.TARGETS_FILE || '/app/targets.yaml';
const NAS_SSH_KEY = process.env.NAS_SSH_KEY || '/run/secrets/nas_ssh_key';
const NAS_UPLOAD = process.env.NAS_UPLOAD !== '0';
const SERVICE = 'apps-db-backup';
const STARTED_AT = Date.now();

let backupRunning = false;
let lastTrigger = null;
let supercronic = null;

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function listTargetStatuses() {
  const dir = path.join(STATUS_DIR, 'targets');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => readJson(path.join(dir, f)))
    .filter(Boolean)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function hoursSince(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / 36e5;
}

function buildHealth() {
  const lastRun = readJson(path.join(STATUS_DIR, 'last-run.json'));
  const targets = listTargetStatuses();
  const dockerOk = fs.existsSync('/var/run/docker.sock');
  let keyOk = false;
  if (fs.existsSync(NAS_SSH_KEY)) {
    try {
      const mode = fs.statSync(NAS_SSH_KEY).mode & 0o777;
      keyOk = (mode & 0o077) === 0; // must not be group/world accessible
    } catch {
      keyOk = false;
    }
  }

  const ageH = hoursSince(lastRun?.finishedAt);
  const stale = ageH == null || ageH > 36;
  const runOk = lastRun?.status === 'ok';
  const runDegraded = lastRun?.status === 'degraded';

  const checks = {
    frontend: { status: 'ok' },
    backend: { status: 'ok' },
    docker: { status: dockerOk ? 'ok' : 'down', detail: dockerOk ? 'socket' : 'missing /var/run/docker.sock' },
    scheduler: { status: supercronic && !supercronic.killed ? 'ok' : 'down' },
    lastBackup: {
      status: !lastRun ? 'down' : runOk && !stale ? 'ok' : runDegraded || stale ? 'down' : 'down',
      detail: lastRun
        ? `${lastRun.status}; ageHours=${ageH != null ? ageH.toFixed(1) : '?'}; ok=${lastRun.ok} fail=${lastRun.failed}`
        : 'no run yet',
      finishedAt: lastRun?.finishedAt || null,
    },
    nas: {
      status: NAS_UPLOAD ? (keyOk ? 'ok' : 'down') : 'skipped',
      detail: NAS_UPLOAD ? (keyOk ? 'ssh key mounted' : 'NAS_SSH_KEY missing') : 'upload disabled',
    },
    storage: {
      status: fs.existsSync(BACKUP_ROOT) ? 'ok' : 'down',
      detail: BACKUP_ROOT,
    },
  };

  const required = ['frontend', 'backend', 'docker', 'scheduler', 'storage'];
  if (NAS_UPLOAD) required.push('nas');
  // lastBackup is required only after the first scheduled window; until then warn via degraded if never run + uptime > 1h
  if (lastRun || (Date.now() - STARTED_AT) > 3600e3) required.push('lastBackup');

  const down = required.filter((k) => checks[k]?.status === 'down');
  let status = 'ok';
  if (down.length) status = down.includes('backend') || down.includes('docker') ? 'down' : 'degraded';
  if (lastRun?.status === 'degraded' && status === 'ok') status = 'degraded';

  return {
    status,
    service: SERVICE,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
    lastRun: lastRun || null,
    targets,
    backupRunning,
    lastTrigger,
  };
}

function sendJson(res, code, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function serveStatic(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const file = path.join(__dirname, 'public', path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(path.join(__dirname, 'public'))) {
    res.writeHead(403);
    return res.end('forbidden');
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    return res.end('not found');
  }
  const ext = path.extname(file);
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.svg': 'image/svg+xml' };
  res.writeHead(200, { 'Content-Type': (types[ext] || 'text/plain') + '; charset=utf-8' });
  fs.createReadStream(file).pipe(res);
}

function triggerBackup(res) {
  if (backupRunning) {
    return sendJson(res, 409, { ok: false, error: 'backup already running' });
  }
  backupRunning = true;
  lastTrigger = new Date().toISOString();
  const child = spawn('bash', ['/app/scripts/backup-all.sh'], {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  child.stdout.on('data', (d) => { out += d.toString(); });
  child.stderr.on('data', (d) => { out += d.toString(); });
  child.on('close', (code) => {
    backupRunning = false;
    fs.mkdirSync(STATUS_DIR, { recursive: true });
    fs.writeFileSync(path.join(STATUS_DIR, 'last-trigger.log'), out.slice(-20000));
    console.log(`[trigger] backup finished code=${code}`);
  });
  sendJson(res, 202, { ok: true, message: 'backup started', triggeredAt: lastTrigger });
}

function startScheduler() {
  const cronFile = '/app/crontab';
  if (!fs.existsSync(cronFile)) {
    console.warn('[scheduler] crontab missing — scheduler disabled');
    return;
  }
  supercronic = spawn('supercronic', ['-quiet', cronFile], {
    env: process.env,
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  supercronic.on('exit', (code) => {
    console.error(`[scheduler] supercronic exited code=${code}`);
    supercronic = null;
  });
  console.log('[scheduler] supercronic started (daily 03:15)');
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/api/health') {
    const health = buildHealth();
    return sendJson(res, health.status === 'ok' ? 200 : 503, health);
  }

  if (url === '/api/status') {
    return sendJson(res, 200, {
      service: SERVICE,
      ...buildHealth(),
      targetsFile: TARGETS_FILE,
      backupRoot: BACKUP_ROOT,
    });
  }

  if (url === '/api/targets') {
    let yaml = '';
    try { yaml = fs.readFileSync(TARGETS_FILE, 'utf8'); } catch { /* ignore */ }
    return sendJson(res, 200, { yaml, statuses: listTargetStatuses() });
  }

  if (url === '/api/backup' && req.method === 'POST') {
    return triggerBackup(res);
  }

  if (url === '/api/backup/last') {
    return sendJson(res, 200, readJson(path.join(STATUS_DIR, 'last-run.json'), { status: 'none' }));
  }

  return serveStatic(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[${SERVICE}] listening on :${PORT}`);
  fs.mkdirSync(STATUS_DIR, { recursive: true });
  fs.mkdirSync(BACKUP_ROOT, { recursive: true });
  startScheduler();
});

process.on('SIGTERM', () => {
  if (supercronic) supercronic.kill('SIGTERM');
  server.close(() => process.exit(0));
});
