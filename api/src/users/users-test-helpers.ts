import type { User, UsersRepository } from '#/users/users-repository'
import { mock } from 'node:test'

export function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'alice@example.com',
    name: 'Alice',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

export function mockRepo(overrides: Partial<UsersRepository> = {}): UsersRepository {
  const notImpl = (): never => {
    throw new Error('not implemented')
  }
  return {
    findAll: mock.fn(overrides.findAll ?? (notImpl as UsersRepository['findAll'])),
    findById: mock.fn(overrides.findById ?? (notImpl as UsersRepository['findById'])),
    upsert: mock.fn(overrides.upsert ?? (notImpl as UsersRepository['upsert'])),
    update: mock.fn(overrides.update ?? (notImpl as UsersRepository['update'])),
    remove: mock.fn(overrides.remove ?? (notImpl as UsersRepository['remove'])),
  }
}
