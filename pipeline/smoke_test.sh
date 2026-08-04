#!/usr/bin/env sh
set -eu

# Invoked by ci-library's `.Docker:Test:Project_Testing` against the built
# runtime image. Boots the standalone server directly (bypassing
# docker-entrypoint.sh, which otherwise loops on `prisma db push`
# waiting for a database that doesn't exist in the CI runner) and
# requires /api/health to return `{"status":"ok"}` within 15 seconds.
# /api/health doesn't touch Prisma, so the server can answer it
# without any DB connectivity. The probe uses node's built-in http
# module: matching the Dockerfile HEALTHCHECK, so we rely on the
# single tool guaranteed by the nodejs22-micro base image.

node server.js > /tmp/server.log 2>&1 &
server_pid=$!

probe() {
  node -e "
    require('http').get('http://127.0.0.1:3000/api/health', r => {
      let b = '';
      r.on('data', d => b += d);
      r.on('end', () => {
        try { process.exit(JSON.parse(b).status === 'ok' ? 0 : 1); }
        catch { process.exit(1); }
      });
    }).on('error', () => process.exit(1));
  "
}

i=0
while [ "$i" -lt 15 ]; do
  if probe 2>/dev/null; then
    kill "$server_pid" 2>/dev/null || true
    echo "Smoke test passed - /api/health returned ok"
    exit 0
  fi
  i=$((i + 1))
  sleep 1
done

kill "$server_pid" 2>/dev/null || true
cat /tmp/server.log >&2
echo "Smoke test failed - /api/health did not return ok within 15 seconds" >&2
exit 1
