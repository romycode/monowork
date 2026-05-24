# monowork

pnpm monorepo with a Fastify API and a Vue 3 frontend.

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | >= 26 |
| pnpm | >= 11 |
| Docker + Compose | v2 |
| just | any recent |

Install `just` via your package manager — [casey/just](https://github.com/casey/just#installation).

## Structure

```
monowork/
├── api/          # Fastify 5 · Drizzle ORM · Zod v4  (port 3000)
├── app/          # Vue 3 · Vite · Pinia · Vue Router  (port 5173)
├── compose.yml   # api + app + postgres dev services
├── justfile      # project task runner
└── pnpm-workspace.yaml
```

## Quick start

```sh
# 1. Install dependencies
pnpm install

# 2. Start all services (postgres, api, app)
just start
```

The api is at `http://localhost:3000` and the app at `http://localhost:5173`.

## Available commands

```sh
just          # list all recipes
just start    # start all services in the background
just stop     # stop and remove containers
just build    # build the production API Docker image
just setup    # build production image then start services
just shell    # open a shell inside the running api container
```

## Development

Each package has the same set of scripts:

```sh
pnpm --filter @monowork/api dev        # start api in watch mode
pnpm --filter @monowork/app dev        # start Vite dev server

pnpm -r lint                           # lint all packages
pnpm -r lint:fix                       # lint and autofix
pnpm -r format                         # format all packages
pnpm -r format:check                   # check formatting
pnpm -r typecheck                      # TypeScript check (api only)
```

## Database

Drizzle Kit manages the schema under `api/src/db/schema.ts`.

```sh
pnpm --filter @monowork/api db:push      # push schema to the running db
pnpm --filter @monowork/api db:generate  # generate migration files
pnpm --filter @monowork/api db:migrate   # run pending migrations
pnpm --filter @monowork/api db:studio    # open Drizzle Studio
```

The local Postgres instance (started by `just start`) is available at `localhost:5432`:

| Setting | Value |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Database | `monowork` |
| User | `monowork` |
| Password | `monowork` |
