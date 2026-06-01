# Add GitHub Actions CI workflow

**Priority:** 4 — Project management
**Added:** 2026-05-27
**Status:** Pending

## Goal

Automate lint, typecheck, and tests on every push and pull request so broken code can't merge unnoticed.

## Scope

- New file: `.github/workflows/ci.yml`

## Workflow design

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

### Jobs

| Job | Runs | Needs services |
|-----|------|----------------|
| **lint** | `just lint` | No |
| **format-check** | `just format-check` | No |
| **typecheck** | `just typecheck` | Yes (needs build) |
| **test-unit** | `just test-unit` | Yes |
| **test-acceptance** | `just test-acceptance` | Yes |

## Considerations

- The project uses Docker Compose for everything — the CI workflow drives it
  through `just`, matching local dev exactly.
- Integration tests (`just test-integration`) need a real database. They
  connect to the compose `postgres` service via `DATABASE_URL` (node-postgres,
  not Testcontainers), so CI pushes the schema with `just db-push` after
  postgres is healthy, then runs the full `just test`.

## Resolution (2026-05-31)

- **Runner:** Docker-in-the-runner via official Docker actions
  (`docker/setup-buildx-action`) so the compose build uses Buildx; everything
  else goes through `just`.
- **Telemetry:** disabled in CI — the CI `.env` sets `OTEL_SDK_DISABLED=true`
  and the otel-lgtm observability container is never started.
- **Coverage:** none is collected (api uses `tsx --test`, app uses `vitest
  run` with no coverage config), so there is nothing to disable.
- **Tests:** full `just test` (unit + acceptance + integration + app); the
  integration suite runs against the compose postgres service.

