# Add `@monowork/tracing` tests for `withSpan()`

**Priority:** 2 — Shared infrastructure
**Added:** 2026-05-27
**Status:** Pending

## Goal

Test the `withSpan()` helper in `packages/tracing/src/helpers.ts`. This is a convenience wrapper for one-off traced blocks.

## Scope

- File under test: `packages/tracing/src/helpers.ts` (the `withSpan` export)
- New test file: `packages/tracing/src/helpers.test.ts` (shared with helpers tests)

## Test cases

| Case | What to verify |
|------|----------------|
| Successful async fn | Returns resolved value, span gets `OK` status, span is ended |
| Successful sync fn | Works when callback returns a non-promise value |
| Throwing fn (Error) | Exception recorded, span gets `ERROR` status with message, error re-thrown, span ended |
| Throwing fn (non-Error) | String-serialized, `UnknownError` name used |
| With attributes | Attributes passed through to span options |
| Without attributes | No attributes in span options |

## Approach

Same mocking strategy as `traced.test.ts` — stub `trace.getTracer()` to return a mock tracer. Assert that `startActiveSpan` receives correct name and options, and that the span mock records the expected calls.
