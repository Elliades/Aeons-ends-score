#!/usr/bin/env bash
# Dump one Postgres container → gzip file under BACKUP_ROOT/postgres/
set -euo pipefail
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"

ID="${1:?usage: backup-postgres.sh <id> <container>}"
CONTAINER="${2:?}"

if ! container_running "$CONTAINER"; then
  write_target_status "$ID" false "container_not_running:$CONTAINER"
  log "SKIP $ID — container $CONTAINER not running"
  exit 1
fi

load_pg_env "$CONTAINER"
OUT_DIR="$BACKUP_ROOT/postgres/$ID"
mkdir -p "$OUT_DIR"
STAMP="$(stamp)"
OUT="$OUT_DIR/${ID}-${STAMP}.sql.gz"

log "Dumping $ID ($CONTAINER db=$PG_DB user=$PG_USER) → $OUT"
if [[ -n "${PG_PASSWORD:-}" ]]; then
  docker exec -e PGPASSWORD="$PG_PASSWORD" "$CONTAINER" \
    pg_dump -U "$PG_USER" -d "$PG_DB" --no-owner --no-acl \
    | gzip -c > "$OUT"
else
  docker exec "$CONTAINER" \
    pg_dump -U "$PG_USER" -d "$PG_DB" --no-owner --no-acl \
    | gzip -c > "$OUT"
fi

SIZE="$(stat -c%s "$OUT" 2>/dev/null || wc -c < "$OUT")"
if [[ "$SIZE" -lt 32 ]]; then
  rm -f "$OUT"
  write_target_status "$ID" false "empty_dump"
  log "ERROR $ID — empty dump"
  exit 1
fi

# prune local for this id
find "$OUT_DIR" -type f -name "${ID}-*.sql.gz" -mtime +"$KEEP_LOCAL" -delete 2>/dev/null || true

write_target_status "$ID" true "ok" "$(basename "$OUT")" "$SIZE"
log "OK $ID ($(numfmt --to=iec "$SIZE" 2>/dev/null || echo "${SIZE}B"))"
echo "$OUT"
