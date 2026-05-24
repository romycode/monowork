set shell := ["sh", "-c"]

image := "monowork/api"

# List available recipes
default:
    @just --list

# ── Services ──────────────────────────────────────────────────────────────────

# Bootstrap: build production image then start all services
setup: build start

# Build the production API Docker image
build:
    docker build -t {{image}} -f api/Dockerfile .

# Start all services in the background
start:
    docker compose up -d

# Stop all services and remove containers
stop:
    docker compose down

# Stream logs from all services (ctrl-c to exit)
logs:
    docker compose logs -f

# Open a shell inside the api service
shell:
    docker compose exec api sh

# ── Dependencies ──────────────────────────────────────────────────────────────

# Reinstall dependencies in all service containers (run after adding a package)
install:
    docker compose exec api pnpm install
    docker compose exec app pnpm install

# ── Code quality ──────────────────────────────────────────────────────────────

# Lint all packages
lint:
    docker compose exec api pnpm --filter @monowork/api lint
    docker compose exec app pnpm --filter @monowork/app lint

# Lint and autofix all packages
lint-fix:
    docker compose exec api pnpm --filter @monowork/api lint:fix
    docker compose exec app pnpm --filter @monowork/app lint:fix

# Format all packages
format:
    docker compose exec api pnpm --filter @monowork/api format
    docker compose exec app pnpm --filter @monowork/app format

# Check formatting across all packages
format-check:
    docker compose exec api pnpm --filter @monowork/api format:check
    docker compose exec app pnpm --filter @monowork/app format:check

# TypeScript type check (api)
typecheck:
    docker compose exec api pnpm --filter @monowork/api typecheck

# ── Database ──────────────────────────────────────────────────────────────────

# Push schema to the running database (no migration files)
db-push:
    docker compose exec api pnpm --filter @monowork/api db:push

# Generate migration files from schema changes
db-generate:
    docker compose exec api pnpm --filter @monowork/api db:generate

# Run pending migrations
db-migrate:
    docker compose exec api pnpm --filter @monowork/api db:migrate

# Open Drizzle Studio in the browser
db-studio:
    docker compose exec api pnpm --filter @monowork/api db:studio
