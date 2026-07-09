set shell := ["sh", "-c"]

image := "monowork/api"

# List available recipes
default:
    @just --list

# ── Services ──────────────────────────────────────────────────────────────────

# Bootstrap: build production image then start all services
setup: build install start hooks
    just db-push

# Build the development image used by compose
build:
    docker compose build

# Build and tag the production image with the current git SHA (for releases)
build-prod:
    docker build -t {{image}}:latest -t {{image}}:$(git rev-parse --short HEAD) --target production -f api/Dockerfile .

# Start all services in the background
start:
    docker compose up -d

# Stop all services and remove containers
stop:
    docker compose down

# Remove containers, volumes, and the production image (full reset)
clean:
    docker compose down -v
    docker image rm -f {{image}}

# Stream logs from all services (ctrl-c to exit)
logs:
    docker compose logs -f api

# Open a shell inside the api service as the node user
cli:
    docker compose run --rm -it --user node api bash

# ── Git hooks ─────────────────────────────────────────────────────────────────

# Configure git to use the project's hooks from .githooks/
hooks:
    git config core.hooksPath .githooks
    chmod +x .githooks/*

# ── Dependencies ──────────────────────────────────────────────────────────────

# Reinstall dependencies in all service containers (run after adding a package)
install:
    docker compose run --rm -it --user node api pnpm install
    docker compose run --rm -it --user node app pnpm install

# ── Code quality ──────────────────────────────────────────────────────────────

# Lint all packages
lint:
    docker compose run --rm --no-deps --user node api pnpm --filter @monowork/api lint
    docker compose run --rm --no-deps --user node app pnpm --filter @monowork/app lint

# Lint and autofix all packages
lint-fix:
    docker compose run --rm --no-deps --user node api pnpm --filter @monowork/api lint:fix
    docker compose run --rm --no-deps --user node app pnpm --filter @monowork/app lint:fix

# Format all packages
format:
    docker compose run --rm --no-deps --user node api pnpm --filter @monowork/api format
    docker compose run --rm --no-deps --user node app pnpm --filter @monowork/app format

# Check formatting across all packages
format-check:
    docker compose run --rm --no-deps --user node api pnpm --filter @monowork/api format:check
    docker compose run --rm --no-deps --user node app pnpm --filter @monowork/app format:check

# TypeScript type check (api)
typecheck:
    docker compose exec --user node api pnpm --filter @monowork/api typecheck

# Run all tests (api + app)
test:
    docker compose exec --user node api pnpm --filter @monowork/api test
    docker compose exec --user node app pnpm --filter @monowork/app test

# Run app tests only
test-app:
    docker compose exec --user node app pnpm --filter @monowork/app test

# Run unit tests (domain + application, no I/O) — *.unit.ts
test-unit:
    docker compose exec --user node api pnpm --filter @monowork/api test:unit

# Run acceptance tests (end-to-end API) — *.spec.ts
test-acceptance:
    docker compose exec --user node api pnpm --filter @monowork/api test:acceptance

# Run integration tests (external services, requires running services) — *.int.ts
test-integration:
    docker compose exec --user node api pnpm --filter @monowork/api test:integration

# ── CI ────────────────────────────────────────────────────────────────────────
# Recipes used by .github/workflows/ci.yml so the workflow drives everything
# through just, never docker compose directly. They differ from the local
# service recipes above in three CI-specific ways: a frozen lockfile, telemetry
# disabled, and the otel-lgtm observability stack left down.

# Install workspace deps for CI (frozen lockfile).
# Clears NODE_OPTIONS because compose sets it to preload the OTel hook
# (--import @opentelemetry/instrumentation/hook.mjs) — which isn't installed
# yet, so node would fail to resolve that import before pnpm can install it.
# Runs as root (image default) to write into the runner-owned checkout.
ci-install:
    docker compose run --rm --no-deps -e NODE_OPTIONS= api pnpm install --frozen-lockfile

# Start only the services the test run needs, with telemetry disabled.
# Writes a gitignored compose.override.yml that sets OTEL_SDK_DISABLED on the
# api dev server (compose.yml declares no env_file, so this is how the var is
# injected); compose auto-merges the override into every later recipe too.
# --no-deps skips otel-lgtm, which the api service otherwise pulls in.
ci-up:
    printf 'services:\n  api:\n    environment:\n      OTEL_SDK_DISABLED: "true"\n' > compose.override.yml
    docker compose up -d --no-deps postgres api app

# Wait until api/app accept exec and postgres is ready, before driving them.
# --no-deps (in ci-up) skips the depends_on healthcheck wait, so poll here.
ci-wait:
    #!/usr/bin/env bash
    set -euo pipefail
    for svc in api app; do
      ok=
      for i in $(seq 1 30); do
        if docker compose exec -T "$svc" true 2>/dev/null; then
          echo "$svc is ready"; ok=1; break
        fi
        echo "waiting for $svc... ($i)"; sleep 2
      done
      if [ -z "$ok" ]; then
        echo "$svc did not become ready in time"; docker compose logs "$svc"; exit 1
      fi
    done
    ok=
    for i in $(seq 1 30); do
      if docker compose exec -T postgres pg_isready -U monowork >/dev/null 2>&1; then
        echo "postgres is ready"; ok=1; break
      fi
      echo "waiting for postgres... ($i)"; sleep 2
    done
    if [ -z "$ok" ]; then
      echo "postgres did not become ready in time"; docker compose logs postgres; exit 1
    fi

# Compile the api so db-push can resolve #/env. drizzle-kit resolves the `#/`
# subpath via package.json "imports" (#/* → ./dist/src/*.js), not the tsconfig
# paths mapping (which it reports as unsupported), so drizzle.config.ts's
# `import { env } from "#/env"` needs dist/ to exist. A fresh checkout has no
# dist/, so build it before db-push. Runs as root (image default, not the node
# user the other exec recipes use) because writing dist/ into the runner-owned
# bind mount needs root; the emitted files stay world-readable for db-push.
ci-build-api:
    docker compose exec api pnpm --filter @monowork/api build

# ── Database ──────────────────────────────────────────────────────────────────

# Push schema to the running database (no migration files)
db-push:
    docker compose exec --user node api pnpm --filter @monowork/api db:push

# Generate migration files from schema changes
db-generate:
    docker compose exec --user node api pnpm --filter @monowork/api db:generate

# Run pending migrations
db-migrate:
    docker compose exec --user node api pnpm --filter @monowork/api db:migrate

# Open Drizzle Studio in the browser
db-studio:
    docker compose exec --user node api pnpm --filter @monowork/api db:studio
