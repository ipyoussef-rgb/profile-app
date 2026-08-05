# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.2] - 2026-08-04

### Fixed

- A broken auth state in the Super-App WebView no longer sticks. A failed OIDC
  callback used to return a bare 400 and leave every cookie in place; because
  cookies live in the WebView cookie jar, the error survived killing the app and
  signing in again. Failures now always wipe all auth cookies, retry the login
  silently once, and otherwise show a page with a recovery link instead of
  looping.
- The session JWT lifetime dropped from 8 hours to 30 minutes. It is never
  re-checked against the IDP, so its lifetime was the window in which a logout in
  the Super App went unnoticed here — the mini-app kept letting the user in while
  every KOBIL call failed.

### Added

- `GET /api/auth/reset` clears every cookie this app owns and returns to `/`, so
  a stuck WebView can always be recovered from the inside.

### Security

- npm is removed from the runtime image. The scanner reported Critical/High CVEs
  in npm's own bundled dependencies (tar, sigstore, ip-address,
  brace-expansion) — none of them in this app's lockfile. Nothing at runtime
  uses npm or npx, so deleting it fixes those findings outright and shrinks the
  image.
- CVE-2026-54369 (libacl) and CVE-2026-58043 (the Node.js 22.22.2 binary) are
  waived in the ignore files. Both are shipped by the pinned base image and
  cannot be patched from this repository; each needs a rebuilt base image. The
  npm removal above did clear the seven npm-package findings — these two are all
  that remain, and neither involves application code.

## [1.2.1] - 2026-08-04

### Fixed

- Identity editing no longer loses data when the IDP read fails, rejects
  impossible birthdates, stores canonical E.164 phone numbers, and the WebView
  pinning no longer makes the page unscrollable.

### Security

- postcss 8.5.25 and sharp 0.35.3 via npm `overrides`, plus js-yaml and
  brace-expansion through the lockfile — clears all high-severity advisories
  the pipeline reported as fixable, without a Next.js major upgrade. postcss is
  build-time only and `next/image` (sharp) is not used, but both are pinned to
  patched versions rather than ignored.

## [1.2.0] - 2026-06-23

### Fixed

- OIDC token-exchange URL now derives from `APP_BASE_URL` instead of the
  request host in both `auth/callback` and `admin/auth/callback`. Behind the
  ingress `req.url` resolves to `0.0.0.0:3000`, which made Keycloak reject the
  code→token exchange with `invalid_redirect_uri`.
- Removed the root `app/` directory (health/metrics) that shadowed `src/app/`;
  in a `src/app/` project a root `app/` makes Next.js ignore `src/app/` and
  404 every route. health + metrics remain under `src/app/api/`.
- Dockerfile no longer COPYs the nonexistent `prisma.config.ts`, and the
  builder `npm ci` runs with `--ignore-scripts` so the `postinstall` Prisma
  generate does not run before the schema is copied (the client is generated
  by `npm run build`).

## [1.1.0] - 2026-06-22

Initial release of profile-app on the standard KOBIL DevOps surface.

### Added

- profile-app on the standard KOBIL DevOps surface
- GitLab CI pipeline using ci-library 27.24.0, with smoke test against
  `/api/health` and the `Project.Enforce Version` gate.
- Helm chart `profile-app` on `ks-chart-template-common` 0.24.1,
  including readiness, liveness, and startup probes, plus the
  ServiceMonitor block and Istio routing.
- OCI image labels populated by ci-library docker-multiarch at build
  time.
