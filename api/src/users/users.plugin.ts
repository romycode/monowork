import { db } from '#/db/index'
import { createUsersRepository } from '#/users/users.repo'
import { usersRouter } from '#/users/users.routes'
import { userService } from '#/users/users.service'
import { traced } from '@monowork/tracing/traced'
import type { FastifyPluginAsync } from 'fastify'

// Composition root for the users slice: build the repository + service over the
// `db` singleton (each wrapped with `traced` for observability) and register the
// HTTP adapter. `app.ts` only has to `void app.register(usersSlice)`. Keeping
// the wiring here (not in users.routes.ts) leaves the router free of
// infrastructure imports, so its acceptance test never pulls in `db`.
export const usersSlice: FastifyPluginAsync = async (app) => {
  const repo = traced(createUsersRepository(db), 'UsersRepository')
  const usersService = traced(userService(repo), 'UsersService')
  void app.register(usersRouter, { usersService })
}
