# quatermaster-backup

Backs up durable AI / Story data **on Quatermaster** to the same Q-NAS Volume_3 tree used by `apps-db-backup`.

`apps` cannot see Quatermaster disks — this agent must run locally.

## Targets

| Id | Service | What |
|----|---------|------|
| `risuai` | RisuAI / Story live save | `ai-chat\data\risuai` (pauses container briefly) |
| `story-content` | Story repo | `C:\workspace\Story` (content; not play state) |
| `openwebui` | Open WebUI | `webui.db*` + uploads + vector_db (skips cache) |
| `sillytavern` | SillyTavern | `apps\sillytavern\data` + `config.yaml` |
| `covas` | Covas Trade Intel | AppData DBs + config + plugins |

Destination: `/mnt/HD/HD_c2/apps-backups/quatermaster/<id>/`  
Schedule: **03:30** daily (after apps backups at 03:15).

## Install

```powershell
cd C:\workspace\quatermaster-backup
.\install.ps1
# elevated once for firewall:
Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File C:\workspace\quatermaster-backup\install.ps1'
```

## Manual run

```powershell
.\backup-all.ps1
.\backup-all.ps1 -Only risuai,story-content
Invoke-RestMethod -Method POST http://127.0.0.1:3097/api/backup
```

## URLs

| | |
|--|--|
| UI | http://quatermaster:3097 |
| Tailscale | http://100.127.245.112:3097 |
| Health | `GET /api/health` |
