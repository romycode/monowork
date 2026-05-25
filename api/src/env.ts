import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(7000),
  DATABASE_URL: z.string(),
  npm_package_version: z.string().default('0.0.0'),
  LOKI_ENDPOINT: z.url().default('http://otel-lgtm:3100'),
  OTEL_SERVICE_NAME: z.string().default('monowork-api'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().default('http://otel-lgtm:4318'),
  OTEL_PG_ENHANCED: z.string().default('false'),
})

export const env = schema.parse(process.env)
