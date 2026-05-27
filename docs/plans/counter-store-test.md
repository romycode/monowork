# Add counter store unit test

**Priority:** 3 — Frontend
**Added:** 2026-05-27
**Status:** Pending

## Goal

Write the first frontend test to establish the pattern for future Pinia store tests. The counter store is trivial but serves as a template.

## Scope

- File under test: `app/src/stores/counter.ts`
- New test file: `app/src/stores/counter.test.ts`

## Test cases

| Case | What to verify |
|------|----------------|
| Initial state | `count` is `0`, `doubleCount` is `0` |
| `increment()` once | `count` becomes `1`, `doubleCount` becomes `2` |
| `increment()` multiple times | `count` and `doubleCount` track correctly |

## Approach

Use vitest with `@pinia/testing` or manual `setActivePinia(createPinia())` setup before each test. Call the `useCounterStore()` composable and assert on reactive state.

```ts
import { setActivePinia, createPinia } from 'pinia'
import { useCounterStore } from '~/stores/counter'

beforeEach(() => {
  setActivePinia(createPinia())
})

it('starts at zero', () => {
  const store = useCounterStore()
  expect(store.count).toBe(0)
  expect(store.doubleCount).toBe(0)
})
```

## Dependencies

Requires `test` script in `app/package.json` (see `app-test-script.md`).
