export type User = {
  id: string
  email: string
  name: string
  createdAt: string
  updatedAt: string
}

export type CreateUserInput = {
  email: string
  name: string
  password: string
}

export type UpdateUserInput = {
  email?: string
  name?: string
  password?: string
}

const baseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:7000').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!res.ok) {
    const message = await res
      .json()
      .then((body: { message?: string }) => body.message ?? res.statusText)
      .catch(() => res.statusText)
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

/**
 * Generate a UUID v7 (time-ordered). The API requires v7 ids for `PUT /users/:id`.
 * Implemented inline to avoid a runtime dependency.
 */
export function uuidv7(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)

  const timestamp = Date.now()
  bytes[0] = (timestamp / 2 ** 40) & 0xff
  bytes[1] = (timestamp / 2 ** 32) & 0xff
  bytes[2] = (timestamp / 2 ** 24) & 0xff
  bytes[3] = (timestamp / 2 ** 16) & 0xff
  bytes[4] = (timestamp / 2 ** 8) & 0xff
  bytes[5] = timestamp & 0xff

  // version 7
  bytes[6] = (bytes[6]! & 0x0f) | 0x70
  // variant 10xx
  bytes[8] = (bytes[8]! & 0x3f) | 0x80

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export const usersApi = {
  list: () => request<User[]>('/users'),

  create: (input: CreateUserInput) => {
    const id = uuidv7()
    return request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  },

  update: (id: string, input: UpdateUserInput) =>
    request<User>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  remove: (id: string) =>
    request<void>(`/users/${id}`, {
      method: 'DELETE',
    }),
}
