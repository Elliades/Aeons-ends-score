#!/usr/bin/env bash
# Shared helpers for apps-db-backup
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/data/backups}"
STATUS_DIR="${STATUS_DIR:-/data/status}"
TARGETS_FILE="${TARGETS_FILE:-/app/targets.yaml}"
NAS_HOST="${NAS_HOST:-192.168.1.189}"
NAS_PORT="${NAS_PORT:-2222}"
NAS_USER="${NAS_USER:-admin}"
NAS_REMOTE_ROOT="${NAS_REMOTE_ROOT:-/mnt/HD/HD_c2/apps-backups}"
NAS_SSH_KEY="${NAS_SSH_KEY:-/run/secrets/nas_ssh_key}"
NAS_UPLOAD="${NAS_UPLOAD:-1}"
KEEP_LOCAL="${KEEP_LOCAL:-14}"
KEEP_REMOTE="${KEEP_REMOTE:-30}"

stamp() { date +%Y%m%d-%H%M%S; }
iso_now() { date -u +%Y-%m-%dT%H:%M:%SZ; }

log() { echo "[backup $(date '+%Y-%m-%d %H:%M:%S')] $*" >&2; }

require_docker() {
  if ! docker info >/dev/null 2>&1; then
    log "ERROR: docker socket unavailable"
    return 1
  fi
}

container_running() {
  local name="$1"
  docker inspect -f '{{.State.Running}}' "$name" 2>/dev/null | grep -qx true
}

load_pg_env() {
  # Sets PG_USER / PG_DB / PG_PASSWORD from a running container.
  local c="$1"
  PG_USER="$(docker exec "$c" printenv POSTGRES_USER 2>/dev/null || echo postgres)"
  PG_DB="$(docker exec "$c" printenv POSTGRES_DB 2>/dev/null || echo postgres)"
  PG_PASSWORD="$(docker exec "$c" printenv POSTGRES_PASSWORD 2>/dev/null || true)"
  export PG_USER PG_DB PG_PASSWORD
}

ssh_nas() {
  ssh -i "$NAS_SSH_KEY" \
    -o BatchMode=yes \
    -o StrictHostKeyChecking=accept-new \
    -o IdentitiesOnly=yes \
    -p "$NAS_PORT" \
    "${NAS_USER}@${NAS_HOST}" \
    "$@"
}

scp_nas() {
  local src="$1" dest="$2"
  scp -i "$NAS_SSH_KEY" \
    -o BatchMode=yes \
    -o StrictHostKeyChecking=accept-new \
    -o IdentitiesOnly=yes \
    -P "$NAS_PORT" \
    "$src" "${NAS_USER}@${NAS_HOST}:${dest}"
}

write_target_status() {
  local id="$1" ok="$2" detail="$3" file="${4:-}" size="${5:-0}"
  mkdir -p "$STATUS_DIR/targets"
  cat > "$STATUS_DIR/targets/${id}.json" <<EOF
{
  "id": $(jq -Rn --arg v "$id" '$v'),
  "ok": $([[ "$ok" == "true" ]] && echo true || echo false),
  "detail": $(jq -Rn --arg v "$detail" '$v'),
  "file": $(jq -Rn --arg v "$file" '$v'),
  "bytes": ${size:-0},
  "finishedAt": "$(iso_now)"
}
EOF
}
