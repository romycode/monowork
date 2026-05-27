# Add coverage thresholds to CI

**Priority:** 4 — Project management
**Added:** 2026-05-27
**Status:** Pending

## Goal

Enforce minimum coverage percentages in CI so test coverage can't silently drop.

## Scope

- Modify: `.github/workflows/ci.yml` (or equivalent CI config)
- Modify: `api/package.json` (c8 threshold config)
- Modify: `app/vite.config.ts` (vitest coverage thresholds)

## Proposed thresholds

Start conservative and ratchet up as coverage improves:

| Package | Lines | Branches | Functions |
|---------|-------|----------|-----------|
| API | 60% | 50% | 60% |
| App | 30% | 30% | 30% |

## Configuration

**c8 (API):**
```json
"test:coverage": "c8 --check-coverage --lines 60 --branches 50 --functions 60 tsx --test \"src/**/*.test.ts\""
```

**vitest (App):**
```ts
coverage: {
  provider: 'v8',
  thresholds: {
    lines: 30,
    branches: 30,
    functions: 30,
  },
}
```

## Dependencies

Requires coverage reporting to be configured first (see `coverage-reporting.md`).
Requires CI workflow to exist (see `github-actions-ci.md`).
