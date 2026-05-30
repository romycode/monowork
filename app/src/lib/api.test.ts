import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, usersApi, uuidv7 } from '~/lib/api'

function mockFetch(response: Partial<Response> & { jsonValue?: unknown }) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    statusText: response.statusText ?? 'OK',
    json: async () => response.jsonValue,
  }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('uuidv7', () => {
  it('produces a canonical UUID with version 7 and the correct variant', () => {
    const id = uuidv7()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => uuidv7()))
    expect(ids.size).toBe(100)
  })

  it('is time-ordered (lexicographically sortable)', async () => {
    const first = uuidv7()
    await new Promise((resolve) => setTimeout(resolve, 5))
    const second = uuidv7()
    expect(first < second).toBe(true)
  })
})

describe('usersApi.list', () => {
  it('requests GET /users and returns the parsed body', async () => {
    const users = [{ id: '1', email: 'a@b.com', name: 'A', createdAt: '', updatedAt: '' }]
    const fetchMock = mockFetch({ jsonValue: users })

    const result = await usersApi.list()

    expect(result).toEqual(users)
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:7000/users', expect.any(Object))
  })
})

describe('usersApi.create', () => {
  it('PUTs to a generated v7 id with a JSON body', async () => {
    const fetchMock = mockFetch({ status: 201, jsonValue: { id: 'x' } })

    await usersApi.create({ email: 'a@b.com', name: 'A', password: 'password1' })

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toMatch(/^http:\/\/localhost:7000\/users\/[0-9a-f-]{36}$/)
    expect(init).toMatchObject({ method: 'PUT' })
    expect(JSON.parse(init!.body as string)).toEqual({
      email: 'a@b.com',
      name: 'A',
      password: 'password1',
    })
    expect((init!.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })
})

describe('usersApi.update', () => {
  it('PATCHes the given id', async () => {
    const fetchMock = mockFetch({ jsonValue: { id: '42' } })

    await usersApi.update('42', { name: 'New' })

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('http://localhost:7000/users/42')
    expect(init).toMatchObject({ method: 'PATCH' })
  })
})

describe('usersApi.remove', () => {
  it('DELETEs and resolves on 204 without parsing a body', async () => {
    const fetchMock = mockFetch({ status: 204, jsonValue: undefined })

    await expect(usersApi.remove('42')).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:7000/users/42',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

describe('request error handling', () => {
  it('throws ApiError with the server message on a non-ok response', async () => {
    mockFetch({ ok: false, status: 404, jsonValue: { message: 'User not found' } })

    await expect(usersApi.update('42', { name: 'x' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'User not found',
    })
  })

  it('falls back to statusText when the body has no message', async () => {
    mockFetch({ ok: false, status: 500, statusText: 'Internal Server Error', jsonValue: {} })

    await expect(usersApi.list()).rejects.toBeInstanceOf(ApiError)
  })
})
