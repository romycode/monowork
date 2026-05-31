import type { User } from '#/users/users'
import type { UsersRepository } from '#/users/users.repo'

type UpsertUserInput = { email: string; name: string; password: string }
type UpdateUserInput = {
  email?: string | undefined
  name?: string | undefined
  password?: string | undefined
}

export type UsersService = {
  list: () => Promise<User[]>
  get: (id: string) => Promise<User | undefined>
  upsert: (
    id: string,
    input: UpsertUserInput,
  ) => Promise<{ user: User; created: boolean } | undefined>
  update: (id: string, input: UpdateUserInput) => Promise<User | undefined>
  remove: (id: string) => Promise<User | undefined>
}

export function userService(repo: UsersRepository): UsersService {
  return {
    list: () => repo.findAll(),
    get: (id) => repo.findById(id),
    upsert: (id, input) => repo.upsert(id, input),
    update: (id, input) => repo.update(id, input),
    remove: (id) => repo.remove(id),
  }
}
