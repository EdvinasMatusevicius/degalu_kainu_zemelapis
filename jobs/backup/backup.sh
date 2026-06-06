#!/bin/sh
set -eu

DAILY_DIR=/backups/daily
MONTHLY_DIR=/backups/monthly
RETAIN_DAYS=21
EVENING_HOUR=20

export PGHOST=db
export PGUSER=postgres
export PGDATABASE=degalu_zemelapis
export PGPASSWORD

mkdir -p "$DAILY_DIR" "$MONTHLY_DIR"

log() { echo "[backup $(date -Iseconds)] $*"; }

dump_to() {
  out=$1
  tmp="$out.tmp"
  pg_dump | gzip > "$tmp" && mv "$tmp" "$out"
}

if [ -z "$(ls -A "$MONTHLY_DIR" 2>/dev/null)" ]; then
  out="$MONTHLY_DIR/$(date +%Y-%m-%d)-bootstrap.sql.gz"
  log "Monthly dir empty — bootstrapping to $out"
  dump_to "$out"
fi

startup_out="$DAILY_DIR/$(date +%Y-%m-%d)-startup.sql.gz"
if [ ! -f "$startup_out" ]; then
  log "Writing startup snapshot $startup_out"
  dump_to "$startup_out"
fi

while true; do
  today=$(date +%Y-%m-%d)
  dom=$(date +%d)
  hour=$(date +%H)

  if [ "$hour" -ge "$EVENING_HOUR" ]; then
    if [ ! -f "$DAILY_DIR/$today.sql.gz" ]; then
      log "Writing daily $today"
      dump_to "$DAILY_DIR/$today.sql.gz"
      find "$DAILY_DIR" -maxdepth 1 -name '*.sql.gz' -mtime +$RETAIN_DAYS -delete
    fi

    if [ "$dom" = "01" ] && [ ! -f "$MONTHLY_DIR/$today.sql.gz" ]; then
      log "Writing monthly $today"
      dump_to "$MONTHLY_DIR/$today.sql.gz"
    fi
  fi

  sleep 3600
done
