# Database backups (`apps-db-backup`)

## Problem

Compose/Coolify databases on `apps` had **no scheduled off-host backup**. A bad redeploy or disk failure would lose Postgres data (OAuth tokens, BMW charging history, Drink&Draw, etc.).

## Solution

Dedicated service **`apps-db-backup`** (port **3096**):

1. Reads live `POSTGRES_*` from each DB container (no secrets in Git).
2. Dumps daily at **03:15 Europe/Paris**.
3. Stages on `apps` Docker volumes (14 days).
4. Uploads via **SFTP :2222** to **Q-NAS Volume_3** → `/mnt/HD/HD_c2/apps-backups` (30 days).

Catalog UI: http://apps:3070 — service entry `apps-db-backup`.  
Ops UI: http://apps:3096

## NAS capacity (2026-08-04)

| Volume | Path | Size | Free | Role |
|--------|------|------|------|------|
| Volume_1 | `/mnt/HD/HD_a2` | 3.6 T | **~3 G (full)** | Do not use |
| Volume_2 | `/mnt/HD/HD_b2` | 1.8 T | ~620 G | OK fallback |
| **Volume_3** | `/mnt/HD/HD_c2` | 914 G | **~848 G** | **Primary backup target** |
| Volume_4 | `/mnt/HD/HD_d2` | 914 G | ~436 G | OK fallback |

Current dump footprint is small (~100 MB uncompressed total) — years of retention fit easily on Volume_3.

## Inventory → method

| Catalog service | Container | Backup |
|-----------------|-----------|--------|
| Art Studio Publisher | `art-social-manager-postgres-1` | `pg_dump` |
| Art Studio MinIO | `art-social-manager-minio-1` | tar `/data` |
| Drink and Draw 3 | `drinkanddraw-db` | `pg_dump` |
| anti-doom-scroll | `anti-doom-scroll-db-1` | `pg_dump` |
| BMW Charging API | `bmw-charging-postgres` | `pg_dump` |
| Q-Home / Home Assistant | `homeassistant` | tar `/config` |
| Redis (all) | `*-redis*` | **skip** (cache) |
| price-scout / aeons-end / wake-qm | — | **skip** (no local DB) |
| Paperless / ASEP | — | add when running |
| Covas / Risu / ST / Open WebUI | Quatermaster | **out of scope** (other host) |

## Deploy / run

```powershell
cd c:\workspace\Apps-server
./provision/deploy-apps-db-backup.ps1          # deploy
./provision/deploy-apps-db-backup.ps1 -RunNow  # deploy + immediate backup
```

Manual trigger:

```powershell
./provision/apps.ps1 -Bash "curl -s -X POST http://127.0.0.1:3096/api/backup"
```

## Prerequisites

- `/opt/secrets/nas/id_nas_ed25519` on WSL (`chmod 600`, Linux filesystem — not `/mnt/c`).
- NAS Entware SFTP listening on **2222**.
- Docker socket available to the backup container.

## Restore

```bash
# Postgres
gunzip -c FILE.sql.gz | docker exec -i <pg-container> psql -U <user> -d <db>

# Home Assistant config
docker cp FILE.tar.gz homeassistant:/tmp/restore.tar.gz
docker exec homeassistant tar -C / -xzf /tmp/restore.tar.gz
```
