import {
  type Attributes,
  type Span,
  type SpanOptions,
  SpanStatusCode,
  context,
  trace,
} from '@opentelemetry/api'

const DEFAULT_TRACER_NAME = 'app'

export function getActiveSpan(): Span | undefined {
  return trace.getSpan(context.active())
}

export function setSpanAttribute(key: string, value: string | number | boolean): void {
  const span = getActiveSpan()
  if (!span) return
  span.setAttribute(key, value)
}

export function addSpanEvent(name: string, attributes?: Attributes): void {
  const span = getActiveSpan()
  if (!span) return
  span.addEvent(name, attributes)
}

export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T> | T,
  attributes?: Attributes,
): Promise<T> {
  const tracer = trace.getTracer(DEFAULT_TRACER_NAME)

  const spanOptions: SpanOptions = {}
  if (attributes) spanOptions.attributes = attributes

  return tracer.startActiveSpan(name, spanOptions, async (span): Promise<T> => {
    try {
      const result = await fn(span)
      span.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (error) {
      if (error instanceof Error) {
        span.recordException(error)
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message })
      } else {
        const message = String(error)
        span.recordException({ name: 'UnknownError', message })
        span.setStatus({ code: SpanStatusCode.ERROR, message })
      }
      throw error
    } finally {
      span.end()
    }
  })
}
