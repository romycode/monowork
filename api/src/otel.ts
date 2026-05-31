import { env } from '#/env'
import { FastifyOtelInstrumentation } from '@fastify/otel'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'

// NOTE: there is NO logging here. The Logs signal in OTel JS is still
// experimental (0.x packages with breaking changes). Logs go through pino-loki
// directly to Loki. The only OTel-related part in logs is the mixin,
// which only uses @opentelemetry/api (1.x, stable).

// `deployment.environment.name` is incubating (unstable). Instead of
// importing the constant and coupling ourselves to something that may be renamed,
// we set the key as a literal: an attribute is nothing more than a string.
const ATTR_DEPLOYMENT_ENVIRONMENT_NAME = 'deployment.environment.name' as const

export const fastifyOtelInstrumentation = new FastifyOtelInstrumentation()

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: env.OTEL_SERVICE_NAME,
  [ATTR_SERVICE_VERSION]: env.npm_package_version,
  [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: env.NODE_ENV,
})

const traceExporter = new OTLPTraceExporter({
  url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
})

const metricExporter = new OTLPMetricExporter({
  url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics`,
})

const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 10_000,
})

const sdk = new NodeSDK({
  resource: resource,
  metricReaders: [metricReader],
  traceExporter: traceExporter,
  instrumentations: [
    fastifyOtelInstrumentation,
    new HttpInstrumentation({
      ignoreIncomingRequestHook: (req): boolean => {
        return env.NODE_ENV !== 'development' && (req.url?.startsWith('/health') ?? false)
      },
    }),
    new PgInstrumentation({
      enhancedDatabaseReporting: env.NODE_ENV === 'development',
    }),
  ],
})

sdk.start()

async function shutdownOtel(): Promise<void> {
  try {
    await sdk.shutdown()
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('OTEL shutdown error', err)
  }
}

process.on('SIGTERM', shutdownOtel)
process.on('SIGINT', shutdownOtel)
process.on('SIGQUIT', shutdownOtel)
