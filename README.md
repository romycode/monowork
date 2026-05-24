# monowork

pnpm monorepo with a Fastify API and a Vue 3 frontend.

**Prerequisites: [just](https://github.com/casey/just#installation) and Docker.**  
No Node.js or pnpm installation required on the host.

## Structure

```
monowork/
├── api/               # Fastify 5 · Drizzle ORM · Zod v4       → :3000
├── app/               # Vue 3 · Vite · Pinia · Vue Router        → :5173
├── compose.yml        # api + app + postgres:17 dev services
├── justfile           # all developer tasks (run inside containers)
└── pnpm-workspace.yaml
```

## Quick start

```sh
just start
```

All three services start in the background. Dependencies install automatically inside the containers on first boot — this takes a moment on cold start.

- API → `http://localhost:3000`
- App → `http://localhost:5173`
- Postgres → `localhost:5432`

## Recipes

```sh
just              # list every recipe

# ── Services ──────────────────────────────────────────────────────────────────
just setup        # build dev image then start all services (first-time setup)
just start        # start all services in the background
just stop         # stop and remove containers
just logs         # stream logs from all services  (ctrl-c to exit)
just shell        # open a shell in the api container as the node user

# ── Images ────────────────────────────────────────────────────────────────────
just build        # build the development image (used by compose)
just build-prod   # build the production image tagged :latest + :<git-sha>
just clean        # remove containers, volumes, and the production image

# ── Dependencies ──────────────────────────────────────────────────────────────
just install      # re-run pnpm install in all containers (after adding a package)

# ── Code quality ──────────────────────────────────────────────────────────────
just lint         # lint all packages
just lint-fix     # lint and autofix all packages
just format       # format all packages
just format-check # check formatting without writing changes
just typecheck    # TypeScript check (api)

# ── Database ──────────────────────────────────────────────────────────────────
just db-push      # push schema to the db (no migration files)
just db-generate  # generate migration files from schema changes
just db-migrate   # run pending migrations
just db-studio    # open Drizzle Studio in the browser
```

## Stack

| Layer | Tech |
|---|---|
| Runtime | Node.js 26 · pnpm 11 workspaces |
| API | Fastify 5 · Zod v4 · `@fastify/type-provider-zod` |
| Database | PostgreSQL 17 · Drizzle ORM · drizzle-kit |
| Frontend | Vue 3 · Vite · Pinia · Vue Router |
| Linting | oxlint (shared via workspace catalog) |
| Formatting | oxfmt (shared via workspace catalog) |
| Containers | Docker Compose v2 · multi-stage Dockerfile |
| Tasks | just |

## Docker architecture

The API Dockerfile has six stages:

| Stage | User | Purpose |
|---|---|---|
| `base` | root | installs pnpm globally from `packageManager` field |
| `development` | root | compose target — pnpm ready, source + node_modules are volume-mounted |
| `fetch` | node | `pnpm fetch` with only the lockfile (layer cached until deps change) |
| `deps` | node | `pnpm install --offline` from virtual store |
| `build` | node | compiles TypeScript |
| `production` | node | minimal image — `dist/` + `package.json` only |

Containers run as the `node` user (uid 1000). The startup sequence fixes named-volume ownership then drops privileges via `su`.

## Local Postgres

| Setting  | Value      |
|----------|------------|
| Host     | `localhost` |
| Port     | `5432` |
| Database | `monowork` |
| User     | `monowork` |
| Password | `monowork` |
