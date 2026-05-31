# Rename existing files to new naming convention

## Goal

Align all existing source files with the naming rules defined in AGENTS.md.

## Renames

| Old | New |
|-----|-----|
| `users-repository.ts` | `users.repo.ts` |
| `users-repository.test.ts` | `users.repo.test.ts` |
| `users-service.ts` | `users.service.ts` |
| `users-service.test.ts` | `users.service.test.ts` |
| `users-router.ts` | `users.routes.ts` |
| `users-router.test.ts` | `users.routes.test.ts` |
| `users-test-helpers.ts` | `users.test-helpers.ts` |

## Import updates

| Old import | New import |
|-----------|-----------|
| `#/users/users-repository` | `#/users/users.repo` |
| `#/users/users-service` | `#/users/users.service` |
| `#/users/users-router` | `#/users/users.routes` |
| `#/users/users-test-helpers` | `#/users/users.test-helpers` |

Affected files: `app.ts`, `users.service.ts`, `users.routes.ts`, `users.test-helpers.ts`, `users.service.test.ts`, `users.routes.test.ts`, `users.repo.test.ts`.

## Test script glob updates (`api/package.json`)

| Script | Old glob | New glob |
|--------|---------|---------|
| `test:unit` | `src/**/*-service.test.ts` | `src/**/*.service.test.ts` |
| `test:acceptance` | `src/**/*-router.test.ts` | `src/**/*.routes.test.ts` |
| `test:integration` | `src/**/*-repository.test.ts` | `src/**/*.repo.test.ts` |
