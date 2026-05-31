# Reconcile docs/conventions.md with the dot-name slice convention

**Priority:** 4 — Project management
**Added:** 2026-05-31
**Status:** Pending

## Goal

`docs/conventions.md` still documents the OLD hyphenated slice file names
(`<feature>-schema.ts`, `<feature>-repository.ts`, `<feature>-service.ts`,
`<feature>-router.ts`, `<feature>-test-helpers.ts`), while the live code in
`api/src/users/` and `AGENTS.md` have moved to the dot-name convention
(`users.ts`, `users.db.ts`, `users.repo.ts`, `users.service.ts`,
`users.routes.ts`, `users.test-helpers.ts`). This task brings
`docs/conventions.md` back in sync. Docs-only — no application code changes.

## Authoritative current convention (from `api/src/users/` + `AGENTS.md`)

| Layer | Current file | Stale doc name to replace |
|------|------|------|
| Domain model | `<feature>.ts` | (not documented in conventions yet — add it) |
| DB model | `<feature>.db.ts` | `<feature>-schema.ts` |
| Repository | `<feature>.repo.ts` | `<feature>-repository.ts` |
| Service | `<feature>.service.ts` | `<feature>-service.ts` |
| Routes | `<feature>.routes.ts` | `<feature>-router.ts` |
| Unit test | `<feature>.service.test.ts` | `<feature>-service.test.ts` |
| Acceptance test | `<feature>.routes.test.ts` | `<feature>-router.test.ts` |
| Test helpers | `<feature>.test-helpers.ts` | `<feature>-test-helpers.ts` |

Canonical symbol names (confirmed in source — do NOT invent `createUsersService`):
- Service factory: `userService(repo)` — already correct in the doc examples.
- Repository factory: `createUsersRepository(db)`.
- Types: `User`, `UsersService`, `UsersRepository`, `UserRecord` (repo-local).
- Test helpers: `buildUser(...)`, `mockRepo(...)`.
- Drizzle glob is already `./src/**/*.db.ts` in code; doc still says `*-schema.ts`.

## Scope

Single file: **`docs/conventions.md`**. Exact known stale spots (line numbers
approximate, re-grep before editing):

1. **Slice tree (lines ~54–61)** — rewrite the file list to the dot-name set and
   add the `<feature>.ts` domain-model line so the tree matches the AGENTS.md
   eight-file slice (`.ts`, `.db.ts`, `.repo.ts`, `.service.ts`, `.routes.ts`,
   `.service.test.ts`, `.routes.test.ts`, `.test-helpers.ts`).
2. **Files naming example (line ~120)** — `users-repository.ts` → `users.repo.ts`.
3. **Layer/dependency table (lines ~214–217)** — `<feature>-router.ts`,
   `<feature>-service.ts`, `<feature>-repository.ts`, `<feature>-schema.ts`
   → dot-name equivalents; rename the "Schema" row label to "DB model" and add a
   "Domain model" row (`<feature>.ts`) for completeness.
4. **Drizzle glob (line ~302)** — `./src/**/*-schema.ts` → `./src/**/*.db.ts`.
5. **Test table (lines ~361–362)** — `<feature>-service.test.ts` /
   `<feature>-router.test.ts` → `<feature>.service.test.ts` /
   `<feature>.routes.test.ts`.
6. **Test-helpers paragraph (line ~368)** — `<feature>-test-helpers.ts`
   → `<feature>.test-helpers.ts`.
7. **Example headings (lines ~406, ~419)** — `(<feature>-service.test.ts)` /
   `(<feature>-router.test.ts)` → dot-name.
8. **Acceptance example body** — the exported routes symbol is `usersRouter`
   (confirmed in `api/src/users/users.routes.ts`), so the doc's `usersRouter` is
   already correct; the plugin option key is `usersService` (`register(usersRouter,
   { usersService })`). Leave the `userService(...)` and `mockRepo(...)` calls
   untouched — they already match the code.
9. **Service-factory example (line ~272)** — `createItemsService(...)` →
   bare `itemsService(...)`. Canonical service factories are **bare**
   (`<feature>Service`, e.g. `userService`); only the **repository** factory
   keeps the `create` prefix (`createItemsRepository`, leave as-is). Confirmed by
   `api/src/users/users.service.ts` and decided as the canonical convention.

## Changes

- All file-name tokens in `docs/conventions.md` reflect the dot-name convention.
- The slice tree and layer table gain the `<feature>.ts` domain-model line
  (already mandated by AGENTS.md but missing from conventions).
- A `just format-check` / `just lint` pass (Markdown only) stays green; no code
  or test changes.

## Non-goals

- No changes to application code, tests, Drizzle config, or `AGENTS.md`
  (AGENTS.md is already on the dot-name convention).
- Do NOT rewrite historical `docs/plans/*.md` files — they are point-in-time
  records and intentionally reference the names that existed when written.
- Do NOT rename `userService` to `createUsersService`; the live factory is
  `userService`, so the existing example calls are correct as-is.

## Notes / Trade-offs / Dependencies

- The originating task description claimed conventions.md shows
  `userService(...)` "instead of `createUsersService(...)`". This is inverted:
  the source uses `userService`, so those example lines need no change. The real
  drift is purely the hyphen→dot file-name tokens plus the missing domain-model
  line and the stale Drizzle glob.
- Lands on the rename work already completed in
  [rename-to-new-convention.md](rename-to-new-convention.md) and
  [users-domain-db-split.md](users-domain-db-split.md); no runtime dependency.
- Low risk, single-file, mechanical. Verify each line number by grep at edit
  time since they may shift.
