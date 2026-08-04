#!/usr/bin/env bash
# Run all configured backup targets, upload to NAS, write run status.
set -euo pipefail
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"

LOCK="/tmp/apps-db-backup.lock"
exec 9>"$LOCK"
if ! flock -n 9; then
  log "Another backup run is in progress — skipping"
  exit 0
fi

mkdir -p "$BACKUP_ROOT" "$STATUS_DIR" "$STATUS_DIR/targets" "$STATUS_DIR/logs"
RUN_ID="$(stamp)"
LOG_FILE="$STATUS_DIR/logs/run-${RUN_ID}.log"
exec > >(tee -a "$LOG_FILE") 2>&1

log "=== backup run $RUN_ID start ==="
require_docker

STARTED="$(iso_now)"
OK_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
RESULTS=()

backup_pg() {
  local id="$1" container="$2"
  local out rc=0
  out="$(bash "$(dirname "$0")/backup-postgres.sh" "$id" "$container" | tail -n1)" || rc=$?
  if [[ "$rc" -eq 0 && -n "$out" && -f "$out" ]]; then
    OK_COUNT=$((OK_COUNT + 1))
    RESULTS+=("{\"id\":\"$id\",\"type\":\"postgres\",\"ok\":true}")
    bash "$(dirname "$0")/upload-nas.sh" "$out" postgres "$id" || FAIL_COUNT=$((FAIL_COUNT + 1))
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    RESULTS+=("{\"id\":\"$id\",\"type\":\"postgres\",\"ok\":false}")
    log "FAIL postgres $id (rc=$rc out='$out')"
  fi
}

backup_tar() {
  local id="$1" container="$2" path="$3"
  local out rc=0
  out="$(bash "$(dirname "$0")/backup-docker-tar.sh" "$id" "$container" "$path" | tail -n1)" || rc=$?
  if [[ "$rc" -eq 0 && -n "$out" && -f "$out" ]]; then
    OK_COUNT=$((OK_COUNT + 1))
    RESULTS+=("{\"id\":\"$id\",\"type\":\"docker-tar\",\"ok\":true}")
    bash "$(dirname "$0")/upload-nas.sh" "$out" config "$id" || FAIL_COUNT=$((FAIL_COUNT + 1))
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    RESULTS+=("{\"id\":\"$id\",\"type\":\"docker-tar\",\"ok\":false}")
    log "FAIL docker-tar $id (rc=$rc out='$out')"
  fi
}

# --- Targets (keep in sync with targets.yaml) ---
backup_pg art-social-manager art-social-manager-postgres-1
backup_pg drinkanddraw drinkanddraw-db
backup_pg anti-doom-scroll anti-doom-scroll-db-1
backup_pg bmw-charging bmw-charging-postgres
backup_tar homeassistant homeassistant /config
backup_tar art-social-minio art-social-manager-minio-1 /data

FINISHED="$(iso_now)"
STATUS="ok"
HTTP_HINT=200
if [[ "$FAIL_COUNT" -gt 0 && "$OK_COUNT" -gt 0 ]]; then
  STATUS="degraded"
  HTTP_HINT=503
elif [[ "$FAIL_COUNT" -gt 0 ]]; then
  STATUS="down"
  HTTP_HINT=503
fi

# Probe NAS free space (best-effort)
NAS_DF=""
if [[ "$NAS_UPLOAD" == "1" && -f "$NAS_SSH_KEY" ]]; then
  NAS_DF="$(ssh_nas "df -P '$NAS_REMOTE_ROOT' | tail -1" 2>/dev/null || true)"
fi

RESULTS_JSON="$(printf '%s\n' "${RESULTS[@]:-}" | jq -s '.')"
cat > "$STATUS_DIR/last-run.json" <<EOF
{
  "runId": "$RUN_ID",
  "status": "$STATUS",
  "startedAt": "$STARTED",
  "finishedAt": "$FINISHED",
  "ok": $OK_COUNT,
  "failed": $FAIL_COUNT,
  "skipped": $SKIP_COUNT,
  "targets": $RESULTS_JSON,
  "nas": {
    "host": "$NAS_HOST",
    "remoteRoot": "$NAS_REMOTE_ROOT",
    "df": $(jq -Rn --arg v "$NAS_DF" '$v')
  },
  "log": "logs/run-${RUN_ID}.log"
}
EOF

# Keep last 30 run logs
find "$STATUS_DIR/logs" -type f -name 'run-*.log' | sort -r | tail -n +31 | xargs -r rm -f

log "=== backup run $RUN_ID done status=$STATUS ok=$OK_COUNT fail=$FAIL_COUNT ==="
# Exit 0 even on partial failure so supercronic doesn't spam; health API reflects status.
exit 0
