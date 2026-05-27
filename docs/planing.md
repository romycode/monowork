# Test Coverage Improvement Plan

Tracking document for test coverage work across the monorepo.

---

## Done

| Task | Added | Completed |
|------|-------|-----------|
| Users service — unit tests (6 tests) | pre-existing | pre-existing |
| Users router — acceptance tests (12 tests) | pre-existing | pre-existing |
| Users repository — integration tests (8 tests) | pre-existing | pre-existing |
| Health router — acceptance test (1 test) | pre-existing | pre-existing |

## Pending

### Priority 1 — Quick wins

| Task | Added | Completed |
|------|-------|-----------|
| Add `env.ts` unit tests — validate defaults, missing `DATABASE_URL` throws, `PORT` coercion, invalid `NODE_ENV` rejection | 2026-05-27 | |
| Add `test` script to `app/package.json` (`"test": "vitest"`) | 2026-05-27 | |
| Wire app tests into `just test` in the justfile | 2026-05-27 | |

### Priority 2 — Shared infrastructure

| Task | Added | Completed |
|------|-------|-----------|
| Add `@monowork/tracing` tests for `traced()` — sync/async wrapping, error recording, `captureArgs`/`captureResult` options | 2026-05-27 | |
| Add `@monowork/tracing` tests for `withSpan()` — span lifecycle, error propagation, attribute forwarding | 2026-05-27 | |
| Add `@monowork/tracing` tests for helpers (`getActiveSpan`, `setSpanAttribute`, `addSpanEvent`) | 2026-05-27 | |

### Priority 3 — Frontend

| Task | Added | Completed |
|------|-------|-----------|
| Add counter store unit test (`app/src/stores/counter.ts`) — establish the pattern for future store tests | 2026-05-27 | |

### Priority 4 — Project management

| Task | Added | Completed |
|------|-------|-----------|
| Add GitHub Actions CI workflow — lint, typecheck, unit tests, acceptance tests | 2026-05-27 | |
| Configure coverage reporting — `c8` for API, vitest coverage for app | 2026-05-27 | |
| Add coverage thresholds to CI | 2026-05-27 | |
| Expand pre-commit hook to include acceptance tests | 2026-05-27 | |
