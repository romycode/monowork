# Wire app tests into `just test` in the justfile

**Priority:** 1 — Quick win
**Added:** 2026-05-27
**Status:** Pending

## Goal

Make `just test` run both API and app tests so frontend tests aren't invisible to the standard workflow.

## Scope

- File to modify: `justfile`

## Changes

Update the `test` recipe to also run app tests:

```just
test:
    docker compose exec --user node api pnpm --filter @monowork/api test
    docker compose exec --user node app pnpm --filter @monowork/app test
```

Optionally add a dedicated `test-app` recipe:

```just
test-app:
    docker compose exec --user node app pnpm --filter @monowork/app test
```

## Dependencies

Requires the `test` script in `app/package.json` (see `app-test-script.md`).
