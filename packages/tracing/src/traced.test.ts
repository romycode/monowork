import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import { type SpanOptions, SpanStatusCode, trace } from '@opentelemetry/api'
import { traceFunction, traced } from './traced.ts'

type MockSpan = {
  setAttribute: ReturnType<typeof mock.fn>
  setStatus: ReturnType<typeof mock.fn>
  recordException: ReturnType<typeof mock.fn>
  end: ReturnType<typeof mock.fn>
}

let capturedSpanName: string
let capturedSpanOptions: SpanOptions
let capturedSpan: MockSpan

function makeMockSpan(): MockSpan {
  return {
    setAttribute: mock.fn(),
    setStatus: mock.fn(),
    recordException: mock.fn(),
    end: mock.fn(),
  }
}

function setupTracer() {
  capturedSpanName = ''
  capturedSpanOptions = {}
  capturedSpan = makeMockSpan()

  mock.method(trace, 'getTracer', () => ({
    startActiveSpan: (name: string, options: SpanOptions, cb: (span: MockSpan) => unknown) => {
      capturedSpanName = name
      capturedSpanOptions = options
      capturedSpan = makeMockSpan()
      return cb(capturedSpan)
    },
  }))
}

beforeEach(() => {
  setupTracer()
})

afterEach(() => {
  mock.restoreAll()
})

describe('traceFunction — sync', () => {
  it('returns the same result as the original function', () => {
    const add = (a: number, b: number) => a + b
    assert.equal(traceFunction(add, 'math.add')(2, 3), 5)
  })

  it('creates a span with the given name', () => {
    traceFunction(() => 42, 'ns.fn')()
    assert.equal(capturedSpanName, 'ns.fn')
  })

  it('calls span.end() after the function returns', () => {
    traceFunction(() => 'ok', 'ns.fn')()
    assert.equal(capturedSpan.end.mock.calls.length, 1)
  })

  it('sets span status to OK on success', () => {
    traceFunction(() => 'ok', 'ns.fn')()
    assert.deepEqual(capturedSpan.setStatus.mock.calls[0]?.arguments, [
      { code: SpanStatusCode.OK },
    ])
  })
})

describe('traceFunction — async', () => {
  it('resolves with the same value as the original async function', async () => {
    assert.equal(await traceFunction(async (x: number) => x * 2, 'ns.fn')(5), 10)
  })

  it('calls span.end() after the promise resolves', async () => {
    await traceFunction(async () => 'done', 'ns.fn')()
    assert.equal(capturedSpan.end.mock.calls.length, 1)
  })

  it('sets span status to OK after async resolution', async () => {
    await traceFunction(async () => 'done', 'ns.fn')()
    assert.deepEqual(capturedSpan.setStatus.mock.calls[0]?.arguments, [
      { code: SpanStatusCode.OK },
    ])
  })
})

describe('traceFunction — error handling', () => {
  it('re-throws errors from sync functions', () => {
    assert.throws(
      () =>
        traceFunction(() => {
          throw new Error('boom')
        }, 'ns.fn')(),
      /boom/,
    )
  })

  it('records exception on span when sync function throws', () => {
    const err = new Error('boom')
    try {
      traceFunction(() => {
        throw err
      }, 'ns.fn')()
    } catch {}
    assert.equal(capturedSpan.recordException.mock.calls.length, 1)
    assert.equal(capturedSpan.recordException.mock.calls[0]?.arguments[0], err)
  })

  it('sets span status to ERROR when sync function throws', () => {
    const err = new Error('boom')
    try {
      traceFunction(() => {
        throw err
      }, 'ns.fn')()
    } catch {}
    assert.deepEqual(capturedSpan.setStatus.mock.calls[0]?.arguments, [
      { code: SpanStatusCode.ERROR, message: 'boom' },
    ])
  })

  it('rejects with the same error from async functions', async () => {
    const err = new Error('async boom')
    await assert.rejects(
      traceFunction(async () => {
        throw err
      }, 'ns.fn')(),
      /async boom/,
    )
  })

  it('records exception on span when async function rejects', async () => {
    const err = new Error('async boom')
    try {
      await traceFunction(async () => {
        throw err
      }, 'ns.fn')()
    } catch {}
    assert.equal(capturedSpan.recordException.mock.calls.length, 1)
    assert.equal(capturedSpan.recordException.mock.calls[0]?.arguments[0], err)
  })

  it('does not record exception when recordException is false (sync)', () => {
    try {
      traceFunction(
        () => {
          throw new Error('silent')
        },
        'ns.fn',
        { recordException: false },
      )()
    } catch {}
    assert.equal(capturedSpan.recordException.mock.calls.length, 0)
  })

  it('does not record exception when recordException is false (async)', async () => {
    try {
      await traceFunction(
        async () => {
          throw new Error('silent')
        },
        'ns.fn',
        { recordException: false },
      )()
    } catch {}
    assert.equal(capturedSpan.recordException.mock.calls.length, 0)
  })

  it('still re-throws even when recordException is false', () => {
    assert.throws(
      () =>
        traceFunction(
          () => {
            throw new Error('silent')
          },
          'ns.fn',
          { recordException: false },
        )(),
      /silent/,
    )
  })
})

describe('traceFunction — captureArgs', () => {
  it('sets arg.N attributes when captureArgs is true', () => {
    traceFunction((a: string, b: number) => `${a}-${b}`, 'ns.fn', { captureArgs: true })(
      'hello',
      42,
    )
    const calls = capturedSpan.setAttribute.mock.calls
    assert.ok(calls.some((c) => c.arguments[0] === 'arg.0' && c.arguments[1] === 'hello'))
    assert.ok(calls.some((c) => c.arguments[0] === 'arg.1' && c.arguments[1] === '42'))
  })

  it('does not set arg attributes when captureArgs is not set', () => {
    traceFunction((a: string) => a, 'ns.fn')('hello')
    const argCalls = capturedSpan.setAttribute.mock.calls.filter((c) =>
      String(c.arguments[0]).startsWith('arg.'),
    )
    assert.equal(argCalls.length, 0)
  })
})

describe('traceFunction — captureResult', () => {
  it('sets result attribute when captureResult is true (sync)', () => {
    traceFunction(() => ({ value: 99 }), 'ns.fn', { captureResult: true })()
    const resultCall = capturedSpan.setAttribute.mock.calls.find(
      (c) => c.arguments[0] === 'result',
    )
    assert.ok(resultCall)
    assert.equal(resultCall?.arguments[1], JSON.stringify({ value: 99 }))
  })

  it('sets result attribute when captureResult is true (async)', async () => {
    await traceFunction(async () => 'done', 'ns.fn', { captureResult: true })()
    const resultCall = capturedSpan.setAttribute.mock.calls.find(
      (c) => c.arguments[0] === 'result',
    )
    assert.ok(resultCall)
    assert.equal(resultCall?.arguments[1], 'done')
  })

  it('does not set result attribute when captureResult is not set', () => {
    traceFunction(() => 'value', 'ns.fn')()
    const resultCall = capturedSpan.setAttribute.mock.calls.find(
      (c) => c.arguments[0] === 'result',
    )
    assert.equal(resultCall, undefined)
  })
})

describe('traceFunction — span name and code attributes', () => {
  it('uses namespace.methodName as the span name', () => {
    traceFunction(() => null, 'myService.doWork')()
    assert.equal(capturedSpanName, 'myService.doWork')
  })

  it('sets code.function attribute to the method name part', () => {
    traceFunction(() => null, 'myService.doWork')()
    assert.equal(capturedSpanOptions.attributes?.['code.function'], 'doWork')
  })

  it('sets code.namespace attribute to the namespace part', () => {
    traceFunction(() => null, 'myService.doWork')()
    assert.equal(capturedSpanOptions.attributes?.['code.namespace'], 'myService')
  })
})

describe('traced()', () => {
  it('wraps all function properties and preserves return values', () => {
    const target = {
      greet: (name: string) => `hello ${name}`,
      farewell: (name: string) => `bye ${name}`,
    }
    const wrapped = traced(target, 'greeter')
    assert.equal(wrapped.greet('world'), 'hello world')
    assert.equal(wrapped.farewell('world'), 'bye world')
  })

  it('passes non-function properties through unchanged', () => {
    const target = {
      label: 'service',
      run: () => 'running',
    } as unknown as Record<string, (...args: never[]) => unknown>
    const wrapped = traced(target, 'svc') as Record<string, unknown>
    assert.equal(wrapped.label, 'service')
  })

  it('uses namespace.key as the span name for each method', () => {
    traced({ doThing: () => 'ok' }, 'myNs').doThing()
    assert.equal(capturedSpanName, 'myNs.doThing')
  })

  it('forwards options to each wrapped method', () => {
    traced({ compute: (x: number) => x + 1 }, 'calc', { captureArgs: true }).compute(7)
    const argCall = capturedSpan.setAttribute.mock.calls.find((c) => c.arguments[0] === 'arg.0')
    assert.ok(argCall)
    assert.equal(argCall?.arguments[1], '7')
  })
})
