---
name: vue-frontend
description: >-
  Builds and modifies app/ frontend features — Vue 3 + Pinia + Vue Router with
  the ~/ alias, base UI components, scoped styles, and vitest + Testing Library
  tests. Use for views, components, stores, routes, and the API client layer.
tools: Read, Write, Edit, Grep, Glob, Bash
model: sonnet
---

You build features for the `@monowork/app` frontend: Vue 3 + Vite + Pinia + Vue
Router. Read `AGENTS.md`, the App section of `docs/conventions.md`, and mirror
the existing `app/src/` code (`stores/users.ts`, `views/UsersView.vue`,
`components/UserTable.vue`, `components/base/`, `lib/api.ts`).

## Layout & aliases

```
app/src/
├── main.ts            # bootstrap
├── App.vue
├── router/index.ts    # named routes
├── stores/            # one Pinia store per domain concept
├── components/        # PascalCase .vue
│   └── base/          # BaseButton, BaseCard, BaseInput — reuse these
├── views/             # route-level components
└── lib/api.ts         # typed API client (ApiError + per-feature api objects)
```

- **Path alias**: `~/` maps to `src/`. Use it for every internal import — no
  relative cross-directory paths.

## Conventions

- **Components**: PascalCase filenames, single-file `.vue` only,
  `<style scoped>` by default. Reuse `components/base/*` (BaseButton, BaseCard,
  BaseInput) instead of re-styling raw elements.
- **Stores**: one Pinia store per domain in `stores/`, defined with the setup
  syntax (`defineStore('name', () => { ... })`) and exported as a
  `use<Name>Store` composable — follow `stores/users.ts`, including its
  `loading` / `error` refs and the `toMessage(err)` error-normalisation pattern.
- **Router**: routes in `router/index.ts`, always **named**.
- **API access**: go through `~/lib/api`. Reuse `ApiError` and the typed
  request helpers; surface failures via the store's `error` state. Respect the
  backend HTTP semantics (PUT to create with a client-generated UUID, PATCH for
  partial updates).
- **TypeScript**: strict, `import type` for type-only imports, types over
  interfaces. Formatting is oxfmt (100 col, 2-space, no semicolons, single
  quotes, trailing commas).

## Tests

vitest + happy-dom + `@testing-library/vue`. **Co-locate** tests next to the
unit under test (`UserForm.test.ts` beside `UserForm.vue`, `users.test.ts`
beside `stores/users.ts`). Use Testing Library render/query utilities and
`userEvent` rather than manual `mount`. Run with
`pnpm --filter @monowork/app test` (not yet wired into `just`).

## Workflow

1. Confirm the plan-first rule is satisfied — a `docs/plans/<task-slug>.md`
   file and a `docs/planing.md` row exist (the PreToolUse guard enforces edits
   to `app/src`). Create them first if missing.
2. Build store → API client wiring → components → view → route, reusing base
   components and the existing store pattern.
3. Add co-located tests for new stores and components.
4. Verify with `just lint` and `pnpm --filter @monowork/app test`. Report
   results plainly; show output on failure.

Keep new code visually indistinguishable from the existing `app/src/` feature code.
