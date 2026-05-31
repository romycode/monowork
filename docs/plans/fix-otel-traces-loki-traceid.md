# Fix: OTel traces missing in Grafana and trace_id absent from Loki logs

## Goal

Fix two related observability issues:
1. No traces visible in Grafana Tempo.
2. `trace_id` / `span_id` fields never appear in Loki logs.

## Root cause

`FastifyOtelInstrumentation` (`@fastify/otel`) is registered as a Fastify plugin in `app.ts` but is **not** added to the `NodeSDK.instrumentations` array in `otel.ts`. The SDK-level registration is what enables the OTel `ContextManager` to propagate span context through Fastify's async lifecycle. Without it:

- No active span exists in the OTel async context during request handling.
- `trace.getActiveSpan()` in the pino `mixin()` always returns `undefined`, so `trace_id` and `span_id` are never added to log lines.
- No spans are created/finished by the Fastify instrumentation, so nothing is exported to Tempo.

## Changes

### `api/src/otel.ts`
- Import `FastifyOtelInstrumentation`.
- Instantiate it once and export the instance as `fastifyOtelInstrumentation`.
- Add the instance to the `NodeSDK` `instrumentations` array.

### `api/src/app.ts`
- Remove the local `new FastifyOtelInstrumentation()` call.
- Import `fastifyOtelInstrumentation` from `#/otel` and use `.plugin()` on it.

## Why a shared instance

`@fastify/otel` docs require the **same** instance to be passed to the SDK and registered as a plugin. Using two separate instances would result in the SDK hooking the module with one instance while the plugin hooks Fastify lifecycle with another — they would not share state.

## Dependencies

None — both files already exist. No new packages needed.

## Test verification

After the fix, make a request to any route (e.g. `GET /users`) and confirm:
- The JSON log lines include `trace_id` and `span_id` fields.
- A trace appears in Grafana → Explore → Tempo data source.
