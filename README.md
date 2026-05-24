# monowork

pnpm monorepo with a Fastify API and a Vue 3 frontend.

**Prerequisites: [just](https://github.com/casey/just#installation) and Docker.**  
No Node.js or pnpm installation required on the host.

## Structure

```
monowork/
├── api/          # Fastify 5 · Drizzle ORM · Zod v4  (port 3000)
├── app/          # Vue 3 · Vite · Pinia · Vue Router  (port 5173)
├── compose.yml   # api + app + postgres dev services
├── justfile      # all project tasks
└── pnpm-workspace.yaml
```

## Quick start

```sh
just start
```

Services start in the background. Dependencies install automatically inside the containers on first boot (takes a moment). The api is available at `http://localhost:3000` and the app at `http://localhost:5173`.

## All recipes

```sh
just              # list every recipe

# Services
just setup        # build production image then start all services
just start        # start all services in the background
just stop         # stop and remove containers
just logs         # stream logs from all services (ctrl-c to exit)
just build        # build the production API Docker image
just shell        # open a shell inside the running api container

# Dependencies
just install      # reinstall deps in all containers (run after adding a package)

# Code quality
just lint         # lint all packages
just lint-fix     # lint and autofix all packages
just format       # format all packages
just format-check # check formatting without writing

just typecheck    # TypeScript check (api)

# Database (requires services to be running)
just db-push      # push schema to the db without migration files
just db-generate  # generate migration files from schema changes
just db-migrate   # run pending migrations
just db-studio    # open Drizzle Studio in the browser
```

## Local Postgres

The Postgres instance started by `just start` is reachable at `localhost:5432`:

| Setting  | Value      |
|----------|------------|
| Database | `monowork` |
| User     | `monowork` |
| Password | `monowork` |
