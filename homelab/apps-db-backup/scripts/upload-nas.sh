#!/usr/bin/env bash
# Upload a local file to NAS under remoteRoot/<kind>/<id>/
set -euo pipefail
# shellcheck source=lib.sh
source "$(dirname "$0")/lib.sh"

FILE="${1:?usage: upload-nas.sh <file> <kind> <id>}"
KIND="${2:?}"   # postgres|config
ID="${3:?}"

if [[ "$NAS_UPLOAD" != "1" ]]; then
  log "NAS upload disabled"
  exit 0
fi

if [[ ! -f "$NAS_SSH_KEY" ]]; then
  log "ERROR: NAS key missing at $NAS_SSH_KEY"
  exit 1
fi

REMOTE_DIR="${NAS_REMOTE_ROOT}/${KIND}/${ID}"
ssh_nas "mkdir -p '$REMOTE_DIR'"
scp_nas "$FILE" "${REMOTE_DIR}/$(basename "$FILE")"

# prune remote
ssh_nas "find '$REMOTE_DIR' -type f -mtime +${KEEP_REMOTE} -delete 2>/dev/null || true"
log "Uploaded $(basename "$FILE") → nas:${REMOTE_DIR}/"
