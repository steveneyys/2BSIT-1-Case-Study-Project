#!/usr/bin/env bash
# Restores a backup into an EMPTY database, for example a new Supabase project after a disaster,
# or a scratch database to rehearse a restore. Run: npm run db:restore -- <backup-file> <target-url>
# It refuses to touch a database that already has tables, so it can never overwrite live data.
set -euo pipefail

FILE="${1:-}"; TARGET="${2:-}"
if [ -z "$FILE" ] || [ -z "$TARGET" ]; then
  echo "Usage: npm run db:restore -- <backup-file> <target-database-url>"; exit 1
fi
[ -f "$FILE" ] || { echo "Backup file not found: $FILE"; exit 1; }
for tool in pg_restore psql; do
  command -v "$tool" >/dev/null || { echo "$tool not found. Mac: install Postgres.app (postgresapp.com) and add it to your PATH"; exit 1; }
done

N="$(psql "$TARGET" -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")"
if [ "$N" != "0" ]; then
  echo "Refusing to restore: the target database already has $N table(s) in the public schema."
  echo "Restore only into an empty database."; exit 1
fi

psql "$TARGET" -q -c "CREATE EXTENSION IF NOT EXISTS pg_trgm"
# every database already has a "public" schema, so leave that one entry out of the restore
LIST="$(mktemp "${TMPDIR:-/tmp}/hope-restore.XXXXXX")"; trap 'rm -f "$LIST"' EXIT
pg_restore -l "$FILE" | grep -v ' SCHEMA - public ' > "$LIST"
pg_restore --no-owner --no-privileges --exit-on-error --use-list "$LIST" --dbname "$TARGET" "$FILE"
echo "Restore finished. Check it with: DATABASE_URL=<target-url> npm run db:check"
