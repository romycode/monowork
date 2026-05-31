import { createApp } from '#/app'
import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

describe('GET /health', () => {
  const app = createApp()

  after(async () => {
    await app.close()
  })

  it('returns 200 with status ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.json(), { status: 'ok' })
  })
})
