# monowork

pnpm monorepo with a Fastify 5 API and a Vue 3 frontend, running on Node.js 26.

**Prerequisites: [just](https://github.com/casey/just#installation) and Docker.**
No Node.js or pnpm installation is required on the host.

## Quick start

```sh
just setup   # first time: build image, install deps, start services
just start   # subsequent starts
```

- API → `http://localhost:7000`
- App → `http://localhost:7001`
- Grafana → `http://localhost:7010`

## Stack

| Layer         | Tech                                      |
|---------------|-------------------------------------------|
| Runtime       | Node.js 26 · pnpm 11 workspaces           |
| API           | Fastify 5 · Zod v4 · Drizzle ORM          |
| Database      | PostgreSQL 17                             |
| Frontend      | Vue 3 · Vite · Pinia · Vue Router         |
| Observability | OpenTelemetry · Grafana · Loki · Tempo    |
| Tooling       | oxlint · oxfmt · just · Docker Compose    |
| API client    | Bruno (`bruno/`)                          |

## Further reading

- [`AGENTS.md`](AGENTS.md) — commands, ports, architecture (for AI agents and contributors)
- [`docs/conventions.md`](docs/conventions.md) — code style, naming, testing, and project structure conventions
