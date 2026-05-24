set shell := ["sh", "-c"]

image := "monowork/api"

# List available recipes
default:
    @just --list

# Bootstrap: build production image then start all services
setup: build start

# Build the production Docker image (context must be repo root for pnpm workspace files)
build:
    docker build -t {{image}} -f api/Dockerfile .

# Start all services in the background
start:
    docker compose up -d

# Stop all services and remove containers
stop:
    docker compose down

# Open a shell inside the api service
shell:
    docker compose exec api sh
