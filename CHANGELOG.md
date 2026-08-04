# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
