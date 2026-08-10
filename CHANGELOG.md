# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.8] - 2026-08-10

### Removed

- The three temporary probe cookies from the login response. The cause of the
  failing WebView login turned out to be an IDP registration detail — the URI had
  to be registered with a trailing slash, which matches what this app sends
  (`${APP_BASE_URL}/`) — so the probes have served their purpose. They set real
  cookies on every login and do not belong in a released build.

### Changed

- Kept the `requestDiag` logging on `oidc_login_start` and `oidc_callback_failed`
  (cookie names, sec-fetch-* trio, RSC flag, referer host, forwarded IP,
  user-agent tail, `state_head`). It has no side effects, costs nothing, and this
  bug took three wrong diagnoses partly because none of it was visible.

## [1.2.7] - 2026-08-07

### Changed

- Reverted the state cookie back to `SameSite=Lax`. Setting it to `None` did not
  fix the WebView login, and `profile_auth_retry` — also Lax — demonstrably does
  arrive on the callback, so SameSite was never the cause. Diagnosing before
  changing anything else.

### Security

- Waived CVE-2026-56848 and CVE-2026-56846, two more advisories against the Node
  22.22.2 binary in the pinned base image. Checked whether a package-level rule
  could end this: it cannot. The ci-library requires every ignore entry to carry
  `vulnerability` and `reason` and strips every other key, so grype's native
  package rules are filtered out — per-CVE entries are the only mechanism. Three
  node advisories in three days; the lasting fix is a base-image refresh from
  DevOps, not more entries here.

### Added

- Diagnostics for the missing state cookie. `oidc_login_start` and
  `oidc_callback_failed` now both log the request context: cookie names, the
  `sec-fetch-site`/`-mode`/`-dest` trio (which is what decides whether a SameSite
  cookie is sent), whether the request is an RSC prefetch, the referer host, the
  forwarded client IP and a truncated user-agent — plus `state_head` on both sides
  so a callback can be matched to the login that issued its state.
- Three probe cookies set alongside the real state cookie, each differing from it
  in exactly one attribute (Lax, None, non-httpOnly). The callback reports which
  survived the round-trip through the IDP, which isolates the cause instead of
  guessing: none arriving while `_ga` does means the callback lands in a different
  cookie jar; the short Lax probe arriving while the 237-byte state cookie does
  not means size or encoding; only None arriving means SameSite after all.
  Temporary — to be removed once the cause is known.

## [1.2.6] - 2026-08-07

### Fixed

- Every login in the Super App's WebView died with `missing_state_cookie`. The
  OIDC state cookie was `SameSite=Lax`, which is only guaranteed on top-level
  navigations — and the WebView does not treat the redirect back from the IDP as
  one, so the cookie was silently withheld. The logs made it visible: on the
  failing callback only same-site cookies arrived (`profile_auth_retry`, `_ga`),
  never `profile_oidc_state`, although both are set with identical attributes.
  Both state cookies (user and admin login) are now `SameSite=None` when served
  over https, falling back to Lax on plain http where None would be rejected for
  lacking Secure. The CSRF defence is unchanged: it rests on comparing the state
  in the cookie against the state query parameter, not on the SameSite attribute.

## [1.2.5] - 2026-08-05

### Fixed

- The KOBIL logo in the footer rendered as a broken image. Files in `public/` are
  served from the root, but the istio VirtualService enumerates the paths it
  routes and only `/favicon.ico` was listed, so `/kobil-logo.png` got a
  body-less 404 from the gateway and never reached the app. Moved both images to
  `public/assets/` and routed `/assets` in the istio and ingress path lists, so
  every future static asset is covered by one prefix instead of needing its own
  entry.

## [1.2.4] - 2026-08-05

### Fixed

- Deploying into an environment that injects istio sidecars failed while
  templating the chart: `nil pointer evaluating interface {}.image` at
  `.Values.envoySidecarHelper.image.repository`. `ks-chart-template-common` is a
  `type: library` chart, so the default in its own values.yaml is never merged
  into `.Values` — the parent chart has to carry it. Added the block, copied
  verbatim from the library (0.24.1). It only surfaced in the shift/addons
  environment because the sidecar renders only when all four istio flags are
  true, and locally the two `global.*` ones are false, so `helm lint` and the
  monaco deploy both passed.

## [1.2.3] - 2026-08-05

### Changed

- ci-library pinned ref moved from `aceccea4` (27.24.0, April) to `bb597622`
  (27.31.0, July). Checked before switching: the anchors this repo extends
  (`.Docker:Test:Project_Testing`, `.retry-without-script-failure`) still exist,
  so nothing here breaks. The upgrade also drops the `Releases:NotifyTeams` job,
  which the library removed as failing — one less job that can redden a release.

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
