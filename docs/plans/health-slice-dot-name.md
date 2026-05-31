# Rename the health slice to the dot-name convention

**Priority:** 4 — Project management
**Added:** 2026-05-31
**Completed:** 2026-05-31
**Status:** Done

## Goal

`api/src/health/` is the last slice still on the OLD hyphenated file names
(`health-router.ts`, `health-router.test.ts`). Every other slice (`users/`,
`organizations/`) and `AGENTS.md` use the dot-name convention
(`<feature>.routes.ts`). Bring the health slice in line.

## Renames

| Old | New |
|-----|-----|
| `api/src/health/health-router.ts` | `api/src/health/health.routes.ts` |
| `api/src/health/health-router.test.ts` | `api/src/health/health.routes.test.ts` |

Use `git mv` to preserve history.

## Import updates

| File | Old import | New import |
|------|-----------|-----------|
| `api/src/app.ts` | `#/health/health-router` | `#/health/health.routes` |

The exported symbol `healthRouter` already matches the `<feature>Router`
convention (cf. `usersRouter`) and does not change.

## Test glob impact

`api/package.json` `test:acceptance` already globs `src/**/*.routes.test.ts`,
so the renamed test is picked up automatically — no script change needed.

## Non-goals

- No behavioural changes to the health endpoint.
- No new service/repo/db files — health is a router-only slice by design.
- Historical `docs/plans/*.md` are left untouched.

## Notes / Trade-offs / Dependencies

- Mechanical, low risk. Sibling task `conventions-doc-naming-reconciliation.md`
  fixes the doc that still describes the dash-style names.
