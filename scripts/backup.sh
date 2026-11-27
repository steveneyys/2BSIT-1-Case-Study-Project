#!/usr/bin/env bash
# Backs up the whole HOPE database (all tables and data, views, functions, triggers) to
# backups/hope-YYYYMMDD-HHMMSS.dump. Run: npm run db:backup
# Needs pg_dump (Mac: install Postgres.app from postgresapp.com).
set -euo pipefail
cd "$(dirname "$0")/.."

command -v pg_dump >/dev/null || { echo "pg_dump not found. Mac: install Postgres.app (postgresapp.com) and add it to your PATH"; exit 1; }

URL="${DATABASE_URL:-}"
if [ -z "$URL" ] && [ -f .env ]; then
  URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2-)"
  URL="${URL%\"}"; URL="${URL#\"}"
fi
[ -n "$URL" ] || { echo "DATABASE_URL is missing (set it in .env)"; exit 1; }

mkdir -p backups
OUT="backups/hope-$(date +%Y%m%d-%H%M%S).dump"
pg_dump "$URL" --format=custom --schema=public --no-owner --no-privileges --file "$OUT"
echo "Backup saved: $OUT ($(du -h "$OUT" | cut -f1))"
echo "It contains real data (e-mails, password hashes). Keep it private; never commit it."
