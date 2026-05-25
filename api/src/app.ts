import {db} from '#/db/index'
import {createUsersRepository} from '#/db/users-repository'
import {env} from '#/env'
import {healthRoutes} from '#/routes/health'
import {usersRoutes} from '#/routes/users'
import {FastifyOtelInstrumentation} from '@fastify/otel'
import type {ZodTypeProvider} from '@fastify/type-provider-zod'
import {serializerCompiler, validatorCompiler} from '@fastify/type-provider-zod'
import {SpanStatusCode, trace} from '@opentelemetry/api'
import Fastify from 'fastify'

export function createApp() {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'test'
        ? false
        : {
            mixin() {
              const span = trace.getActiveSpan()
              if (!span) return {}
              const ctx = span.spanContext()
              return { trace_id: ctx.traceId, span_id: ctx.spanId }
            },
            transport: {
              targets: [
                { target: 'pino/file', level: 'info', options: { destination: 1 } },
                {
                  target: 'pino-loki',
                  level: 'info',
                  options: {
                    host: env.LOKI_ENDPOINT,
                    labels: {
                      service_name: env.OTEL_SERVICE_NAME,
                    },
                    batching: true,
                    interval: 5,
                  },
                },
              ],
            },
          },
  }).withTypeProvider<ZodTypeProvider>()

  void app.register(new FastifyOtelInstrumentation().plugin())

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  app.addHook('onRequest', (req, _reply, done) => {
    trace.getActiveSpan()?.setAttribute('fastify.request_id', String(req.id))
    done()
  })

  app.addHook('onResponse', (req, reply, done) => {
    const span = trace.getActiveSpan()
    if (span) {
      span.setAttribute('http.route', req.routeOptions.url ?? req.url)
      span.setAttribute('http.response.status_code', reply.statusCode)
    }
    done()
  })

  app.addHook('onError', (_req, _reply, err, done) => {
    const span = trace.getActiveSpan()
    if (span) {
      span.recordException(err)
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message })
    }
    done()
  })

  void app.register(healthRoutes)
  void app.register(usersRoutes, { repo: createUsersRepository(db) })

  return app
}
