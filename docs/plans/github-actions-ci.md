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

- The project uses Docker Compose for everything — the CI workflow should `just setup` then run each job, or use a matrix to parallelize.
- Alternatively, run `pnpm` directly in CI without Docker for faster cold starts (requires installing Node.js + pnpm + Postgres service container).
- Integration tests (`just test-integration`) need a real database — include a Postgres service container.

## Open questions

- Docker-in-Docker vs native Node.js in CI? Docker matches local dev but is slower. Native is faster but diverges from local.
