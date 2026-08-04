FROM node:20-alpine

RUN apk add --no-cache \
      bash \
      docker-cli \
      gzip \
      tar \
      openssh-client \
      curl \
      jq \
      coreutils \
      findutils \
      util-linux \
    && curl -fsSL -o /usr/local/bin/supercronic \
         https://github.com/aptible/supercronic/releases/download/v0.2.33/supercronic-linux-amd64 \
    && chmod +x /usr/local/bin/supercronic

WORKDIR /app

COPY package.json ./
COPY server.js ./
COPY targets.yaml ./
COPY scripts/ ./scripts/
COPY public/ ./public/
COPY crontab ./crontab

RUN chmod +x /app/scripts/*.sh \
 && sed -i 's/\r$//' /app/scripts/*.sh /app/crontab \
 && mkdir -p /data/backups /data/status

ENV PORT=3096 \
    BACKUP_ROOT=/data/backups \
    STATUS_DIR=/data/status \
    TARGETS_FILE=/app/targets.yaml \
    NAS_SSH_KEY=/run/secrets/nas_ssh_key \
    TZ=Europe/Paris

EXPOSE 3096

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -sf http://127.0.0.1:3096/api/health || exit 1

CMD ["node", "server.js"]
