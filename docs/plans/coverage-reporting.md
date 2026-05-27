# Configure coverage reporting

**Priority:** 4 — Project management
**Added:** 2026-05-27
**Status:** Pending

## Goal

Add code coverage collection so the team can track test coverage over time and spot regressions.

## Scope

### API (`api/`)

- Tool: Node.js built-in coverage via `--experimental-test-coverage` flag, or `c8` wrapping `tsx --test`
- Config: add coverage script to `api/package.json`
- Output: text summary + lcov for CI integration

### App (`app/`)

- Tool: vitest built-in coverage via `@vitest/coverage-v8`
- Config: add `coverage` section to `app/vite.config.ts`
- Output: text summary + lcov for CI integration

## Changes

**`api/package.json`:**
```json
"test:coverage": "c8 --reporter=text --reporter=lcov tsx --test \"src/**/*.test.ts\""
```

**`app/vite.config.ts`:**
```ts
test: {
  globals: true,
  environment: 'happy-dom',
  coverage: {
    provider: 'v8',
    reporter: ['text', 'lcov'],
  },
}
```

## Dependencies

Install `c8` as a dev dependency in API (or use Node.js native coverage). Install `@vitest/coverage-v8` in app.
