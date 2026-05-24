set shell := ["sh", "-c"]

image := "monowork/api"

# List available recipes
default:
    @just --list

# ── Services ──────────────────────────────────────────────────────────────────

# Bootstrap: build production image then start all services
setup: build start

# Build the production API Docker image (local tag only)
build:
    docker build -t {{image}} -f api/Dockerfile .

# Build and tag the production image with the current git SHA (for releases)
build-prod:
    docker build -t {{image}}:latest -t {{image}}:$(git rev-parse --short HEAD) -f api/Dockerfile .

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
    docker compose logs -f

# Open a shell inside the api service as the node user
shell:
    docker compose exec --user node api sh

# ── Dependencies ──────────────────────────────────────────────────────────────

# Reinstall dependencies in all service containers (run after adding a package)
install:
    docker compose exec --user node api pnpm install
    docker compose exec --user node app pnpm install

# ── Code quality ──────────────────────────────────────────────────────────────

# Lint all packages
lint:
    docker compose exec --user node api pnpm --filter @monowork/api lint
    docker compose exec --user node app pnpm --filter @monowork/app lint

# Lint and autofix all packages
lint-fix:
    docker compose exec --user node api pnpm --filter @monowork/api lint:fix
    docker compose exec --user node app pnpm --filter @monowork/app lint:fix

# Format all packages
format:
    docker compose exec --user node api pnpm --filter @monowork/api format
    docker compose exec --user node app pnpm --filter @monowork/app format

# Check formatting across all packages
format-check:
    docker compose exec --user node api pnpm --filter @monowork/api format:check
    docker compose exec --user node app pnpm --filter @monowork/app format:check

# TypeScript type check (api)
typecheck:
    docker compose exec --user node api pnpm --filter @monowork/api typecheck

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
