# Add `@monowork/tracing` tests for helpers

**Priority:** 2 — Shared infrastructure
**Added:** 2026-05-27
**Status:** Pending

## Goal

Test the standalone helper functions in `packages/tracing/src/helpers.ts`: `getActiveSpan`, `setSpanAttribute`, and `addSpanEvent`.

## Scope

- File under test: `packages/tracing/src/helpers.ts`
- Test file: `packages/tracing/src/helpers.test.ts` (shared with `withSpan` tests)

## Test cases

| Function | Case | What to verify |
|----------|------|----------------|
| `getActiveSpan` | Active span exists | Returns the span from `trace.getSpan(context.active())` |
| `getActiveSpan` | No active span | Returns `undefined` |
| `setSpanAttribute` | Active span exists | Calls `span.setAttribute(key, value)` |
| `setSpanAttribute` | No active span | No-op, no error thrown |
| `addSpanEvent` | Active span exists | Calls `span.addEvent(name, attributes)` |
| `addSpanEvent` | No active span | No-op, no error thrown |
| `addSpanEvent` | Without attributes | Calls `span.addEvent(name, undefined)` |

## Approach

Stub `trace.getSpan()` and `context.active()` from `@opentelemetry/api`. Toggle between returning a mock span and returning `undefined` to cover both branches.
