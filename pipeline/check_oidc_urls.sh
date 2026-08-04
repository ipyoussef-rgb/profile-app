#!/usr/bin/env sh
# OIDC redirect_uri guard (KOBIL CI scaffold).
#
# Fails the pipeline when an OIDC code->token exchange or RP-initiated logout
# builds its URL from the incoming REQUEST (a `new URL(req.url)` / request URL,
# or the Host / X-Forwarded-Host header) instead of the app's configured public
# base (APP_BASE_URL).
#
# Why this matters: openid-client derives the token-exchange `redirect_uri` from
# the URL you hand it. Behind an ingress the request host is the pod's internal
# bind address (0.0.0.0:3000), so the redirect_uri won't match the one used at
# /authorize and Keycloak rejects the exchange with `invalid_redirect_uri`. The
# correct pattern reads only the path + query from the request and resolves them
# against APP_BASE_URL, e.g.:
#
#     const currentUrl = new URL(`${req.nextUrl.pathname}${req.nextUrl.search}`, appBaseUrl)
#
# This is a tripwire, not a proof: it scans only files that perform the OIDC
# token exchange, and passes cleanly when none exist.
set -eu

oidc_files=$(grep -rIlE "authorizationCodeGrant|buildEndSessionUrl" \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git \
  --exclude-dir=dist --exclude-dir=build . 2>/dev/null || true)

if [ -z "$oidc_files" ]; then
  echo "OIDC URL guard: no OIDC token-exchange code found - nothing to check."
  exit 0
fi

bad=""
for f in $oidc_files; do
  # request-URL construction: new URL(req.url) / new URL(request.url) / req.nextUrl
  if grep -nE "new URL\(\s*(req|request)(uest)?\." "$f" >/dev/null 2>&1; then
    bad="$bad $f"
    continue
  fi
  # absolute URL built from a spoofable host header
  if grep -nE "\.get\(\s*['\"](x-forwarded-host|host)['\"]" "$f" >/dev/null 2>&1; then
    bad="$bad $f"
  fi
done

if [ -n "$bad" ]; then
  echo "OIDC URL guard FAILED - these files build an OIDC URL from the request host:" >&2
  for f in $bad; do echo "  - $f" >&2; done
  echo "" >&2
  echo "Behind an ingress the request host is the pod's internal address" >&2
  echo "(0.0.0.0:3000), so the redirect_uri won't match the one used at /authorize" >&2
  echo "and Keycloak rejects the exchange (invalid_redirect_uri)." >&2
  echo "Build absolute URLs from APP_BASE_URL, e.g.:" >&2
  echo "  new URL(\`\${req.nextUrl.pathname}\${req.nextUrl.search}\`, appBaseUrl)" >&2
  exit 1
fi

echo "OIDC URL guard passed - OIDC URLs are derived from APP_BASE_URL, not the request."
exit 0
