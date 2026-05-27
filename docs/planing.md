# Test Coverage Improvement Plan

Tracking document for test coverage work across the monorepo.

---

## Done

- [x] Users service — unit tests (6 tests)
- [x] Users router — acceptance tests (12 tests)
- [x] Users repository — integration tests (8 tests)
- [x] Health router — acceptance test (1 test)

## Pending

### Priority 1 — Quick wins

- [ ] Add `env.ts` unit tests — validate defaults, missing `DATABASE_URL` throws, `PORT` coercion, invalid `NODE_ENV` rejection
- [ ] Add `test` script to `app/package.json` (`"test": "vitest"`)
- [ ] Wire app tests into `just test` in the justfile

### Priority 2 — Shared infrastructure

- [ ] Add `@monowork/tracing` tests for `traced()` — sync/async wrapping, error recording, `captureArgs`/`captureResult` options
- [ ] Add `@monowork/tracing` tests for `withSpan()` — span lifecycle, error propagation, attribute forwarding
- [ ] Add `@monowork/tracing` tests for helpers (`getActiveSpan`, `setSpanAttribute`, `addSpanEvent`)

### Priority 3 — Frontend

- [ ] Add counter store unit test (`app/src/stores/counter.ts`) — establish the pattern for future store tests

### Priority 4 — Project management

- [ ] Add GitHub Actions CI workflow — lint, typecheck, unit tests, acceptance tests
- [ ] Configure coverage reporting — `c8` for API, vitest coverage for app
- [ ] Add coverage thresholds to CI
- [ ] Expand pre-commit hook to include acceptance tests
