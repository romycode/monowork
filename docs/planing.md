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
| API security hardening (helmet, cors, rate-limit, under-pressure, error sanitisation) | [api-security-hardening.md](plans/api-security-hardening.md) | 2026-05-27 | 2026-05-27 |
| Add `env.ts` unit tests | [env-unit-tests.md](plans/env-unit-tests.md) | 2026-05-27 | 2026-05-27 |
| Add `test` script to `app/package.json` | [app-test-script.md](plans/app-test-script.md) | 2026-05-27 | 2026-05-27 |
| Wire app tests into `just test` in the justfile | [wire-app-tests-justfile.md](plans/wire-app-tests-justfile.md) | 2026-05-27 | 2026-05-27 |
| Users — soft delete (`deleted_at`) | [users-soft-delete.md](plans/users-soft-delete.md) | 2026-05-28 | 2026-05-28 |
| Users — guard mutations against soft-deleted records | [users-soft-delete-guard-mutations.md](plans/users-soft-delete-guard-mutations.md) | 2026-05-31 | 2026-05-31 |
| Users — split domain model from database model | [users-domain-db-split.md](plans/users-domain-db-split.md) | 2026-05-31 | 2026-05-31 |
| Rename existing files to new naming convention | [rename-to-new-convention.md](plans/rename-to-new-convention.md) | 2026-05-31 | 2026-05-31 |

## Pending


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
| User management dashboard | [user-management-dashboard.md](plans/user-management-dashboard.md) | 2026-05-30 | 2026-05-30 |
| Base UI components + centralized CSS | [base-ui-components.md](plans/base-ui-components.md) | 2026-05-30 | 2026-05-30 |

### Priority 4 — Project management

| Task | Plan | Added | Completed |
|------|------|-------|-----------|
| Add GitHub Actions CI workflow | [github-actions-ci.md](plans/github-actions-ci.md) | 2026-05-27 | |
| Configure coverage reporting | [coverage-reporting.md](plans/coverage-reporting.md) | 2026-05-27 | |
| Add coverage thresholds to CI | [coverage-thresholds-ci.md](plans/coverage-thresholds-ci.md) | 2026-05-27 | |
| Expand pre-commit hook to include acceptance tests | [expand-pre-commit-hook.md](plans/expand-pre-commit-hook.md) | 2026-05-27 | |

### Priority 5 — Infrastructure

| Task | Plan | Added | Completed |
|------|------|-------|-----------|
| Docker image optimization (follow pnpm guide) | [docker-image-optimization.md](plans/docker-image-optimization.md) | 2026-05-30 | 2026-05-30 |
