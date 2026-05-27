# API Security Hardening (Fastify 5 — 2026 Best Practices)

## Goal

Apply current OWASP and Fastify security recommendations to the API layer. The API currently has zero security middleware — no HTTP security headers, no rate limiting, no CORS restrictions, no backpressure protection, and no error sanitisation.

## Scope

All changes target `api/src/` and `api/package.json`.

## Changes

### 1. Install security plugins

| Package | Purpose |
|---|---|
| `@fastify/helmet` | HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) |
| `@fastify/cors` | Cross-Origin Resource Sharing restrictions |
| `@fastify/rate-limit` | Per-IP request rate limiting |
| `@fastify/under-pressure` | Backpressure monitoring — auto 503 when overloaded |

### 2. Configure in `app.ts`

Register all four plugins globally before any routers. Configuration:

- **Helmet**: enabled globally, CSP default directives
- **CORS**: origin restricted via `CORS_ORIGIN` env var (default `*` in dev)
- **Rate limit**: configurable max + window via env (default 100/min)
- **Under-pressure**: event loop delay + heap thresholds

### 3. Add env vars to `env.ts`

- `CORS_ORIGIN` — allowed origin(s), comma-separated or `*`
- `RATE_LIMIT_MAX` — max requests per window (default 100)
- `RATE_LIMIT_WINDOW_MS` — window size in ms (default 60000)

### 4. Harden Fastify factory

- Set `bodyLimit` explicitly (1 MiB)
- Enable `trustProxy` for correct client IP detection behind reverse proxy

### 5. Sanitise errors in production

- Add custom `setErrorHandler` that strips stack traces outside development

### 6. Update acceptance tests

- Register helmet/cors/rate-limit in acceptance test `buildApp()` helpers so tests reflect real behaviour, OR document that acceptance tests use a minimal Fastify instance without security plugins (current pattern).

## Test plan

- Existing tests must continue to pass (security plugins are registered at the app level, not in routers)
- Typecheck must pass
