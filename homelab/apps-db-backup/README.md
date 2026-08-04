# apps-db-backup

Dedicated backup service for the `apps` mini-server. Dumps every durable database daily and ships copies to **Q-NAS Volume_3** (`/mnt/HD/HD_c2/apps-backups`, ~848 GiB free).

## What is backed up

| Target | Service (catalog) | Method |
|--------|-------------------|--------|
| `art-social-manager` | Art Studio Publisher | `pg_dump` → `.sql.gz` |
| `drinkanddraw` | Drink and Draw 3 | `pg_dump` → `.sql.gz` |
| `anti-doom-scroll` | anti-doom-scroll | `pg_dump` → `.sql.gz` |
| `bmw-charging` | BMW Charging API | `pg_dump` (Timescale) → `.sql.gz` |
| `homeassistant` | Q-Home | `tar` of `/config` |
| `art-social-minio` | Art Studio MinIO | `tar` of `/data` |

Skipped on purpose: Redis caches, stateless apps (price-scout, aeons-end tracker).

**Quatermaster AI / Story** (Risu, Story content, Open WebUI, SillyTavern, Covas) is backed up by the sibling agent  
`C:\workspace\quatermaster-backup` (port **3097**) into the same NAS tree under `…/apps-backups/quatermaster/`.

## Schedule & retention

- Cron: **03:15 Europe/Paris** daily (`supercronic`)
- Local staging on `apps`: **14 days**
- NAS remote: **30 days**

## URLs

| Access | URL |
|--------|-----|
| LAN | http://apps:3096 |
| Tailscale | http://100.93.92.42:3096 |
| Health | `GET /api/health` |
| Trigger | `POST /api/backup` |

## Deploy

```powershell
cd c:\workspace\Apps-server
./provision/deploy-apps-db-backup.ps1
```

Requires `/opt/secrets/nas/id_nas_ed25519` on the WSL host (ed25519 key authorized on NAS SFTP port **2222**).

## Restore (Postgres example)

```bash
gunzip -c /data/backups/postgres/art-social-manager/art-social-manager-YYYYMMDD-HHMMSS.sql.gz \
  | docker exec -i art-social-manager-postgres-1 \
      psql -U artstudio -d art_social_manager
```

Or from NAS:

```bash
scp -P 2222 -i /opt/secrets/nas/id_nas_ed25519 \
  admin@192.168.1.189:/mnt/HD/HD_c2/apps-backups/postgres/art-social-manager/<file>.sql.gz .
```
