import { db } from '#/db/index'
import { env } from '#/env'
import { healthRouter } from '#/health/health.routes'
import { createOrganizationsRepository } from '#/organizations/organizations.repo'
import { organizationsRouter } from '#/organizations/organizations.routes'
import { organizationService } from '#/organizations/organizations.service'
import { createUsersRepository } from '#/users/users.repo'
import { usersRouter } from '#/users/users.routes'
import { userService } from '#/users/users.service'
import { fastifyOtelInstrumentation } from '#/otel'
import { traced } from '@monowork/tracing/traced'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'
import { serializerCompiler, validatorCompiler } from '@fastify/type-provider-zod'
import underPressure from '@fastify/under-pressure'
import { SpanStatusCode, trace } from '@opentelemetry/api'
import Fastify, { type FastifyError } from 'fastify'

function parseTrustProxy(value: string): boolean | string | string[] | number {
  if (value === 'true') return true
  if (value === 'false') return false
  const num = Number(value)
  if (Number.isInteger(num)) return num
  if (value.includes(',')) return value.split(',').map((s) => s.trim())
  return value
}

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
    trustProxy: parseTrustProxy(env.TRUST_PROXY),
  }).withTypeProvider<ZodTypeProvider>()

  void app.register(fastifyOtelInstrumentation.plugin())

  // --- security plugins ---

  const helmetOpts =
    env.NODE_ENV === 'development'
      ? { global: true, contentSecurityPolicy: false as const }
      : {
          global: true,
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'none'"],
              frameAncestors: ["'none'"],
            },
          },
          hsts: { maxAge: 63_072_000, includeSubDomains: true, preload: true },
        }
  void app.register(helmet, helmetOpts)

  void app.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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

  // --- error sanitization ---

  app.setErrorHandler<FastifyError>((err, req, reply) => {
    const statusCode = err.statusCode ?? 500

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

    return reply.code(statusCode).send({
      statusCode,
      error: err.name,
      message: err.message,
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

  const orgsRepo = traced(createOrganizationsRepository(db), 'OrganizationsRepository')
  const orgsService = traced(organizationService(orgsRepo), 'OrganizationsService')
  void app.register(organizationsRouter, { organizationsService: orgsService })

  return app
}
