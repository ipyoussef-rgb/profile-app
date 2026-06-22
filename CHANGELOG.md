# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
