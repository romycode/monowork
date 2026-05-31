# Docker image optimization

Follow [pnpm's Docker guide](https://pnpm.io/docker#minimizing-docker-image-size-and-build-time) to minimise image size and build time for `api/Dockerfile`.

## Goal

Align the API's production image build with the techniques the pnpm guide recommends:

1. BuildKit cache mounts for the pnpm store, so the store survives between builds rather than being rebuilt every time the lockfile or any package manifest changes.
2. `pnpm deploy` to produce a self-contained directory holding only the runtime files and pruned, production-only `node_modules` for `@monowork/api`. This is pnpm's recommended pattern for monorepos.
3. A minimal final stage that copies just the deploy output — no pnpm, no source files, no devDependencies.

## Problems with the current Dockerfile

- The `production` stage copies `dist/` and `package.json` but **no `node_modules`**. The API is compiled by `tsc` (not bundled), so the emitted JS still `import`s `fastify`, `pg`, `drizzle-orm`, `@opentelemetry/*`, `@monowork/tracing`, etc. The image would fail at startup. `pnpm deploy` fixes this by emitting a pruned `node_modules` that contains exactly those runtime dependencies (and the workspace `@monowork/tracing` package, with its raw `.ts` files which Node 26 strips natively).
- The `fetch` / `deps` split caches per-layer in the image, but rebuilding from scratch (CI cold cache, lockfile change) still re-downloads everything. A cache mount caches the store across builds.
- Without `pnpm deploy`, even if we copied `node_modules` from the build stage we'd ship dev dependencies (tsx, drizzle-kit, drizzle-seed, oxlint, oxfmt, typescript, @types/*, etc.) — a large chunk of bytes that production never executes.

## Approach

Replace the `fetch` → `deps` → `build` chain with a single `build` stage that:

1. Copies the workspace.
2. Runs `pnpm install --frozen-lockfile` under `--mount=type=cache,id=pnpm,target=/pnpm/store`.
3. Runs `pnpm --filter @monowork/api build` to produce `api/dist/`.
4. Runs `pnpm deploy --filter @monowork/api --prod /prod/api`, which assembles `/prod/api/` with `package.json` + a pruned production `node_modules` + the package files (including the freshly built `dist/`).

The `production` stage then becomes a clean `node:26-slim` with no pnpm: copy `/prod/api/node_modules`, `/prod/api/package.json`, and `/prod/api/dist`.

The `base` and `development` stages stay as they are — compose still targets `development`, source is volume-mounted, and the `packageManager`-driven pnpm install in `base` is preserved (Node 26 no longer ships `corepack` enabled by default, so the explicit `npm install -g pnpm@<pinned>` route remains the reliable option).

## Scope

- `api/Dockerfile` — rewrite the dependency/build/production stages per above.
- `.dockerignore` — extend to drop a few more directories that don't belong in the build context (`docs/`, `bruno/`, `.idea/`, `.githooks/`, `README.md`, `AGENTS.md`, `CLAUDE.md`).
- No changes to `compose.yml`, `justfile`, application code, or package.json files.

## Verification

- `just build` still succeeds (development image used by compose).
- `just build-prod` produces a working production image — `docker run --rm monowork/api:latest node -e "require('fastify')"` resolves the dependency (i.e. `node_modules` is present and pruned correctly).
- Image size shrinks materially vs. the current build (no devDependencies, no pnpm in the final layer).
