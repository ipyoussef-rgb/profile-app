#!/usr/bin/env bash
set -euo pipefail

# Compose DATABASE_URL from libpq's standard env vars the chart's
# mainContainer.envFromConfigmap / envFromSecret inject. The chart
# splits the connection so the secret-bearing piece (PGPASSWORD)
# lands in a Kubernetes Secret while the rest stays in a ConfigMap.
# Honour an existing DATABASE_URL when set: local `npm run dev` and
# the workbench compose stack populate it directly, and the Dockerfile
# build stage exports a dummy URL for `prisma generate`.
if [ -z "${DATABASE_URL:-}" ]; then
    PGHOST="${PGHOST:-localhost}"
    PGPORT="${PGPORT:-5432}"
    PGUSER="${PGUSER:-}"
    PGPASSWORD="${PGPASSWORD:-}"
    PGDATABASE="${PGDATABASE:-}"
    PGSCHEMA="${PGSCHEMA:-public}"

    # urlencode the user / password so special characters in the
    # secret don't break the connection string.
    enc() { node -e "process.stdout.write(encodeURIComponent(process.argv[1]))" "$1"; }
    PGUSER_ENC=$(enc "${PGUSER}")
    PGPASSWORD_ENC=$(enc "${PGPASSWORD}")

    export DATABASE_URL="postgresql://${PGUSER_ENC}:${PGPASSWORD_ENC}@${PGHOST}:${PGPORT}/${PGDATABASE}?schema=${PGSCHEMA}"
fi

# prisma/schema.prisma reads PROFILE_DATABASE_URL (+ _UNPOOLED for migrations)
# — the Vercel-Neon naming convention. Cluster Postgres has no pgbouncer
# distinction, so mirror DATABASE_URL into both slots when they're unset.
export PROFILE_DATABASE_URL="${PROFILE_DATABASE_URL:-${DATABASE_URL}}"
export PROFILE_DATABASE_URL_UNPOOLED="${PROFILE_DATABASE_URL_UNPOOLED:-${DATABASE_URL}}"

# libpq has no native PGSCHEMA: psql, pg_dump, pg_isready etc. read
# PGOPTIONS instead. Derive it from PGSCHEMA so any client tool
# launched inside this container picks up the right search path
# without extra glue. Don't overwrite a caller-set PGOPTIONS.
if [ -z "${PGOPTIONS:-}" ] && [ -n "${PGSCHEMA:-}" ]; then
    export PGOPTIONS="-c search_path=${PGSCHEMA}"
fi

# Run the prisma CLI directly via its entry script. `npx` would need
# `node_modules/.bin/prisma`, which Next.js's standalone trace doesn't
# ship and we'd otherwise have to copy separately.
PRISMA_BIN="./node_modules/prisma/build/index.js"

echo "Waiting for database..."
until node "${PRISMA_BIN}" db push 2>/dev/null; do
    echo "DB not ready, retrying in 2s..."
    sleep 2
done

echo "Database ready. Starting server..."
exec node server.js
