# Add `@monowork/tracing` tests for `traced()`

**Priority:** 2 — Shared infrastructure
**Added:** 2026-05-27
**Status:** Pending

## Goal

Test the `traced()` and `traceFunction()` exports in `packages/tracing/src/traced.ts`. This is shared infrastructure used by every feature via `app.ts`.

## Scope

- File under test: `packages/tracing/src/traced.ts`
- New test file: `packages/tracing/src/traced.test.ts`

## Test cases

| Case | What to verify |
|------|----------------|
| Sync function wrapping | Wrapped function returns same result, span is created and ended |
| Async function wrapping | Wrapped async function resolves correctly, span ends after resolution |
| Error in sync function | Exception is recorded on span, error re-thrown |
| Error in async function | Rejection is recorded on span, promise rejects |
| `captureArgs: true` | Arguments are serialized as span attributes (`arg.0`, `arg.1`, etc.) |
| `captureResult: true` | Return value is serialized as `result` attribute |
| `recordException: false` | Error is re-thrown but NOT recorded on span |
| `traced()` wraps all methods | All function properties of target object are wrapped, non-functions pass through |
| Namespace and function name | Span name is `namespace.methodName`, attributes include `code.function` and `code.namespace` |

## Approach

Stub the `@opentelemetry/api` `trace.getTracer()` to return a mock tracer with a mock `startActiveSpan` that captures the span name and calls the callback with a mock span. Assert on span method calls (`setAttribute`, `setStatus`, `recordException`, `end`).

## Dependencies

Need to decide on a test runner for the `packages/tracing` package — either `node:test` (matching API) or vitest. Add a `test` script to `packages/tracing/package.json`.
