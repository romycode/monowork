import { z } from 'zod'

export const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(7000),
  DATABASE_URL: z.string(),
  npm_package_version: z.string().default('0.0.0'),
  LOKI_ENDPOINT: z.url().default('http://otel-lgtm:3100'),
  OTEL_SERVICE_NAME: z.string().default('monowork-api'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().default('http://otel-lgtm:4318'),
  OTEL_PG_ENHANCED: z.string().default('false'),
  TRUST_PROXY: z.string().default('true'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
})

export const env = schema.parse(process.env)
