# CI: run tests via just + Docker

## Goal

Add a GitHub Actions workflow that runs the test suite the same way a
developer does locally — through the `just` task runner driving Docker
Compose — so CI exercises the exact commands documented in `AGENTS.md`.

## Scope

- `.github/workflows/ci.yml` — workflow triggered on pushes to `main` and on
  pull requests that:
  - checks out the repo
  - installs `just`
  - creates the `.env` file that `compose.yml` requires (`env_file: .env`)
  - builds the dev images (`just build`)
  - starts the stack (`just start`) and waits until the `api` and `app`
    containers accept `docker compose exec`
  - runs the suite (`just test`)
  - tears the stack down

## Notes

- `compose.yml` declares `env_file: .env` for the `api`, `app`, and
  `otel-lgtm` services. `.env` is gitignored and absent on a fresh checkout,
  so the workflow must create it before any `docker compose` command runs.
  The `api` service gets `DATABASE_URL`/`OTEL_*` from the compose
  `environment:` block, so an empty `.env` is sufficient.
- `just test` runs both `docker compose exec api pnpm … test` and `… app …
  test`, so both containers must be running. `just start` (`docker compose up
  -d`) starts `api`, `app`, and `postgres`; `otel-lgtm` is gated behind the
  `observability` profile and stays down (OTel export failures are
  non-fatal).
- `postgres` gates `api` startup via a healthcheck (`depends_on … condition:
  service_healthy`).
- API tests are unit (`*.service.test.ts`) + acceptance (`*.routes.test.ts`),
  both mocking the repository, so no schema push is needed. There are
  currently no integration (`*.repo.test.ts`) tests.
- Dependencies are baked into the dev images by the Dockerfiles, so no
  separate `just install` step is required in CI.

## Test cases / verification

- The workflow's `just test` step executes the api and app suites and fails
  the job on any failing test.
- YAML validated with a parser before commit.
