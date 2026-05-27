# Test Coverage Improvement Plan

Tracking document for test coverage work across the monorepo. Each task has a detailed plan under [`docs/plans/`](plans/).

---

## Done

| Task | Plan | Added | Completed |
|------|------|-------|-----------|
| Users service — unit tests (6 tests) | — | pre-existing | pre-existing |
| Users router — acceptance tests (12 tests) | — | pre-existing | pre-existing |
| Users repository — integration tests (8 tests) | — | pre-existing | pre-existing |
| Health router — acceptance test (1 test) | — | pre-existing | pre-existing |

## Pending

### Priority 1 — Quick wins

| Task | Plan | Added | Completed |
|------|------|-------|-----------|
| Add `env.ts` unit tests | [env-unit-tests.md](plans/env-unit-tests.md) | 2026-05-27 | |
| Add `test` script to `app/package.json` | [app-test-script.md](plans/app-test-script.md) | 2026-05-27 | |
| Wire app tests into `just test` in the justfile | [wire-app-tests-justfile.md](plans/wire-app-tests-justfile.md) | 2026-05-27 | |

### Priority 2 — Shared infrastructure

| Task | Plan | Added | Completed |
|------|------|-------|-----------|
| Add `@monowork/tracing` tests for `traced()` | [tracing-traced-tests.md](plans/tracing-traced-tests.md) | 2026-05-27 | |
| Add `@monowork/tracing` tests for `withSpan()` | [tracing-withspan-tests.md](plans/tracing-withspan-tests.md) | 2026-05-27 | |
| Add `@monowork/tracing` tests for helpers | [tracing-helpers-tests.md](plans/tracing-helpers-tests.md) | 2026-05-27 | |

### Priority 3 — Frontend

| Task | Plan | Added | Completed |
|------|------|-------|-----------|
| Add counter store unit test | [counter-store-test.md](plans/counter-store-test.md) | 2026-05-27 | |

### Priority 4 — Project management

| Task | Plan | Added | Completed |
|------|------|-------|-----------|
| Add GitHub Actions CI workflow | [github-actions-ci.md](plans/github-actions-ci.md) | 2026-05-27 | |
| Configure coverage reporting | [coverage-reporting.md](plans/coverage-reporting.md) | 2026-05-27 | |
| Add coverage thresholds to CI | [coverage-thresholds-ci.md](plans/coverage-thresholds-ci.md) | 2026-05-27 | |
| Expand pre-commit hook to include acceptance tests | [expand-pre-commit-hook.md](plans/expand-pre-commit-hook.md) | 2026-05-27 | |
