import {
  type Attributes,
  type SpanKind,
  type SpanOptions,
  SpanStatusCode,
  type Span,
  trace,
} from '@opentelemetry/api'

export type TraceOptions = {
  kind?: SpanKind
  attributes?: Attributes
  captureArgs?: boolean
  captureResult?: boolean
  recordException?: boolean
}

const DEFAULT_TRACER_NAME = 'app'

function getTracer() {
  return trace.getTracer(DEFAULT_TRACER_NAME)
}

function serialize(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function recordArgs(span: Span, args: unknown[]): void {
  for (let i = 0; i < args.length; i++) {
    span.setAttribute(`arg.${i}`, serialize(args[i]!))
  }
}

function recordResult(span: Span, result: unknown): void {
  span.setAttribute('result', serialize(result))
}

function recordError(span: Span, error: unknown): void {
  if (error instanceof Error) {
    span.recordException(error)
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message })
    return
  }
  const message = serialize(error)
  span.recordException({ name: 'UnknownError', message })
  span.setStatus({ code: SpanStatusCode.ERROR, message })
}

function buildSpanOptions(spanName: string, options: TraceOptions): SpanOptions {
  const fnName = spanName.split('.').pop() ?? spanName
  const ns = spanName.split('.').slice(0, -1).join('.')

  const attrs: Attributes = { 'code.function': fnName }
  if (ns) attrs['code.namespace'] = ns
  if (options.attributes) Object.assign(attrs, options.attributes)

  const spanOptions: SpanOptions = { attributes: attrs }
  if (options.kind !== undefined) spanOptions.kind = options.kind
  return spanOptions
}

function wrapFunction<Args extends unknown[], Return>(
  fn: (...args: Args) => Return,
  spanName: string,
  options: TraceOptions,
): (...args: Args) => Return {
  return function (...args: Args): Return {
    const tracer = getTracer()
    const spanOptions = buildSpanOptions(spanName, options)

    return tracer.startActiveSpan(spanName, spanOptions, (span) => {
      try {
        if (options.captureArgs) recordArgs(span, args)

        const result = fn(...args)

        if (
          result != null &&
          typeof (result as unknown as PromiseLike<unknown>).then === 'function'
        ) {
          return (result as unknown as Promise<unknown>)
            .then((resolved) => {
              if (options.captureResult) recordResult(span, resolved)
              span.setStatus({ code: SpanStatusCode.OK })
              return resolved
            })
            .catch((error: unknown) => {
              if (options.recordException !== false) recordError(span, error)
              throw error
            })
            .finally(() => {
              span.end()
            }) as Return
        }

        if (options.captureResult) recordResult(span, result)
        span.setStatus({ code: SpanStatusCode.OK })
        span.end()
        return result
      } catch (error) {
        if (options.recordException !== false) recordError(span, error)
        span.end()
        throw error
      }
    }) as Return
  }
}

export function traceFunction<Args extends unknown[], Return>(
  fn: (...args: Args) => Return,
  spanName: string,
  options: TraceOptions = {},
): (...args: Args) => Return {
  return wrapFunction(fn, spanName, options)
}

export function traced<T extends Record<string, (...args: never[]) => unknown>>(
  target: T,
  namespace: string,
  options: TraceOptions = {},
): T {
  const result = {} as Record<string, unknown>
  for (const key of Object.keys(target)) {
    const value = target[key]
    if (typeof value === 'function') {
      result[key] = wrapFunction(
        value as (...args: unknown[]) => unknown,
        `${namespace}.${key}`,
        options,
      )
    } else {
      result[key] = value
    }
  }
  return result as T
}
