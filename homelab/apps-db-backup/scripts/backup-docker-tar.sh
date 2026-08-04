#!/usr/bin/env bash
# Tar a path inside a running container → gzip under BACKUP_ROOT/config/
set -euo pipefail
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"

ID="${1:?usage: backup-docker-tar.sh <id> <container> <path>}"
CONTAINER="${2:?}"
PATH_IN="${3:?}"

if ! container_running "$CONTAINER"; then
  write_target_status "$ID" false "container_not_running:$CONTAINER"
  log "SKIP $ID — container $CONTAINER not running"
  exit 1
fi

OUT_DIR="$BACKUP_ROOT/config/$ID"
mkdir -p "$OUT_DIR"
STAMP="$(stamp)"
OUT="$OUT_DIR/${ID}-${STAMP}.tar.gz"
STAGE="$(mktemp -d "/tmp/backup-${ID}.XXXXXX")"
cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT

log "Archiving $ID ($CONTAINER:$PATH_IN) → $OUT"

# Prefer in-container tar when available; fall back to docker cp (MinIO has no tar).
if docker exec "$CONTAINER" sh -c 'command -v tar >/dev/null 2>&1'; then
  docker exec "$CONTAINER" tar -C / -cf - "${PATH_IN#/}" | gzip -c > "$OUT"
else
  log "$ID — no tar in image, using docker cp"
  docker cp "${CONTAINER}:${PATH_IN}" "$STAGE/data"
  tar -C "$STAGE" -czf "$OUT" data
fi

SIZE="$(stat -c%s "$OUT" 2>/dev/null || wc -c < "$OUT")"
if [[ "$SIZE" -lt 64 ]]; then
  rm -f "$OUT"
  write_target_status "$ID" false "empty_archive"
  log "ERROR $ID — empty archive"
  exit 1
fi

find "$OUT_DIR" -type f -name "${ID}-*.tar.gz" -mtime +"$KEEP_LOCAL" -delete 2>/dev/null || true

write_target_status "$ID" true "ok" "$(basename "$OUT")" "$SIZE"
log "OK $ID ($(numfmt --to=iec "$SIZE" 2>/dev/null || echo "${SIZE}B"))"
echo "$OUT"
