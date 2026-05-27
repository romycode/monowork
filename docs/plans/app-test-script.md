# Add `test` script to `app/package.json`

**Priority:** 1 — Quick win
**Added:** 2026-05-27
**Status:** Pending

## Goal

Add the missing `test` script so `pnpm --filter @monowork/app test` works. Vitest is already installed and configured in `app/vite.config.ts`.

## Scope

- File to modify: `app/package.json`

## Changes

Add to the `scripts` object:

```json
"test": "vitest run",
"test:watch": "vitest"
```

`vitest run` executes once and exits (CI-friendly). `vitest` without `run` starts watch mode for development.

## Verification

Run `pnpm --filter @monowork/app test` — should exit 0 with "no test files found" (until tests are added).
