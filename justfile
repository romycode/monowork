set shell := ["sh", "-c"]

image := "monowork/api"

# List available recipes
default:
    @just --list

# ── Services ──────────────────────────────────────────────────────────────────

# Bootstrap: build production image then start all services
setup: build install start hooks

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

# Run unit tests (service layer, no I/O)
test-unit:
    docker compose exec --user node api pnpm --filter @monowork/api test:unit

# Run acceptance tests (HTTP layer, mocked repository)
test-acceptance:
    docker compose exec --user node api pnpm --filter @monowork/api test:acceptance

# Run integration tests (repository layer, requires running services)
test-integration:
    docker compose exec --user node api pnpm --filter @monowork/api test:integration

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
