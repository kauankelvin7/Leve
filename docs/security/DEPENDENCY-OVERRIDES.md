# Dependency security overrides (2026-11-02)

## Why these overrides exist

The full `npm audit` of Leve's development dependency tree reported 18 moderate findings, inherited from `minimatch`, `glob` and `@opentelemetry/core`. npm also reported secondary packages that only inherited these findings. The production-only audit already returned zero findings.

Affected ranges and first fixed versions according to the advisories:
- `minimatch <11.0.1` — GHSA-g3hv-75wg-m249
- `glob >=9.0.0 <=14.0.1` — GHSA-3g3m-2fjr-6pw4
- `@opentelemetry/core <2.8.0` — GHSA-8988-4f7v-96qf

The pinned root `overrides` in package.json resolve these dependencies to patched versions across the tree until upstream tooling updates its version ranges. Lockfile is committed.

## Compatibility / residual risk

These are major-version changes **inside transitive development tooling**, particularly Firebase CLI 15.34.2, ESLint 9 and @google-cloud/pubsub 5. The npm audit result is not a substitute for runtime compatibility. Their declared semver ranges do not all include the overrides; use extra care with Firebase CLI commands other than emulator tests.

Validation gates: clean `npm ci --include=dev`, full and production npm audit, lint, typecheck, unit tests, build, Auth/Firestore emulator integration, E2E tests and CodeQL.

The overrides must never be treated as authorization to change live Firebase projects or to deploy the application. Use `demo-leve` and test credentials for validation. No production deployment is bundled with these changes.

## Future maintenance

Track Firebase CLI, ESLint and @google-cloud/pubsub upstream releases. When they declare dependencies on patched versions, remove overrides one by one, regenerate the lockfile and repeat all checks. Do not use `npm audit fix --force` or downgrade the CLI to a vulnerable/obsolete major merely to silence reports. Do not remove audit gates.

If a Firebase CLI subcommand regresses, revert these overrides in a separate branch and investigate compatible upstream releases before deployment.