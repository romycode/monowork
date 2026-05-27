import { db } from '#/db/index'
import { env } from '#/env'
import { healthRouter } from '#/health/health-router'
import { createUsersRepository } from '#/users/users-repository'
import { usersRouter } from '#/users/users-router'
import { userService } from '#/users/users-service'
import { traced } from '@monowork/tracing/traced'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { FastifyOtelInstrumentation } from '@fastify/otel'
import rateLimit from '@fastify/rate-limit'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'
import { serializerCompiler, validatorCompiler } from '@fastify/type-provider-zod'
import underPressure from '@fastify/under-pressure'
import { SpanStatusCode, trace } from '@opentelemetry/api'
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
    bodyLimit: 1_048_576,
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>()

  void app.register(new FastifyOtelInstrumentation().plugin())

  // --- security plugins ---

  const helmetOpts =
    env.NODE_ENV === 'development'
      ? { global: true, contentSecurityPolicy: false as const }
      : { global: true }
  void app.register(helmet, helmetOpts)

  void app.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    methods: ['GET', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86_400,
  })

  void app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
  })

  void app.register(underPressure, {
    maxEventLoopDelay: 1000,
    maxHeapUsedBytes: 0,
    maxRssBytes: 0,
    maxEventLoopUtilization: 0.98,
    retryAfter: 50,
  })

  // --- validation ---

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  // --- error sanitisation ---

  app.setErrorHandler((err, req, reply) => {
    const statusCode = (err as { statusCode?: number }).statusCode ?? 500

    if (statusCode >= 500) {
      req.log.error(err)
    }

    if (statusCode === 429) {
      return reply.code(429).send({
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded, retry later',
      })
    }

    if (env.NODE_ENV === 'production' && statusCode >= 500) {
      return reply.code(statusCode).send({
        statusCode,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      })
    }

    const name = err instanceof Error ? err.name : 'Error'
    const message = err instanceof Error ? err.message : 'Unknown error'

    return reply.code(statusCode).send({
      statusCode,
      error: name,
      message,
    })
  })

  // --- observability hooks ---

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
      if (err instanceof Error) {
        span.recordException(err)
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message })
      } else {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) })
      }
    }
    done()
  })

  // --- routers ---

  void app.register(healthRouter)

  const usersRepo = traced(createUsersRepository(db), 'UsersRepository')
  const usersService = traced(userService(usersRepo), 'UsersService')
  void app.register(usersRouter, { usersService })

  return app
}
