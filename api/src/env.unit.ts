import { schema } from '#/env'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const validBase = { DATABASE_URL: 'postgresql://localhost:5432/test' }

describe('env schema', () => {
  it('applies defaults when only DATABASE_URL is set', () => {
    const result = schema.parse(validBase)
    assert.equal(result.NODE_ENV, 'development')
    assert.equal(result.PORT, 7000)
    assert.equal(result.npm_package_version, '0.0.0')
    assert.equal(result.LOKI_ENDPOINT, 'http://otel-lgtm:3100')
    assert.equal(result.OTEL_SERVICE_NAME, 'monowork-api')
    assert.equal(result.OTEL_EXPORTER_OTLP_ENDPOINT, 'http://otel-lgtm:4318')
    assert.equal(result.OTEL_PG_ENHANCED, 'false')
  })

  it('throws when DATABASE_URL is missing', () => {
    assert.throws(() => schema.parse({}), { name: 'ZodError' })
  })

  it('coerces PORT from string to number', () => {
    const result = schema.parse({ ...validBase, PORT: '3000' })
    assert.equal(result.PORT, 3000)
    assert.equal(typeof result.PORT, 'number')
  })

  it('rejects invalid NODE_ENV', () => {
    assert.throws(() => schema.parse({ ...validBase, NODE_ENV: 'staging' }), {
      name: 'ZodError',
    })
  })

  it('parses a full valid config', () => {
    const full = {
      DATABASE_URL: 'postgresql://localhost:5432/test',
      NODE_ENV: 'production',
      PORT: '8080',
      npm_package_version: '1.2.3',
      LOKI_ENDPOINT: 'http://loki:3100',
      OTEL_SERVICE_NAME: 'my-api',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel:4318',
      OTEL_PG_ENHANCED: 'true',
    }
    const result = schema.parse(full)
    assert.equal(result.NODE_ENV, 'production')
    assert.equal(result.PORT, 8080)
    assert.equal(result.npm_package_version, '1.2.3')
    assert.equal(result.OTEL_PG_ENHANCED, 'true')
  })
})
