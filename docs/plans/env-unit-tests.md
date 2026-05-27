# Add `env.ts` unit tests

**Priority:** 1 — Quick win
**Added:** 2026-05-27
**Status:** Pending

## Goal

Validate that the Zod schema in `api/src/env.ts` correctly parses, coerces, defaults, and rejects environment variables.

## Scope

- File under test: `api/src/env.ts`
- New test file: `api/src/env.test.ts`

## Test cases

| Case | Input | Expected |
|------|-------|----------|
| Defaults apply | Only `DATABASE_URL` set | `NODE_ENV=development`, `PORT=7000`, etc. |
| Missing `DATABASE_URL` | No `DATABASE_URL` | Throws ZodError |
| `PORT` coercion | `PORT="3000"` (string) | `env.PORT === 3000` (number) |
| Invalid `NODE_ENV` | `NODE_ENV="staging"` | Throws ZodError |
| Valid full config | All vars provided | Parses without error |

## Approach

The schema calls `schema.parse(process.env)` at module level. Tests should call the schema directly (not import `env`) to avoid side effects. Extract the schema to a named export or re-parse inline in tests.

## Files to modify

- `api/src/env.ts` — export the schema for testability (optional, can also inline parse in tests)
- `api/src/env.test.ts` — new file
