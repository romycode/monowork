import type { UsersService } from '#/users/users-service'
import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod'
import { z } from 'zod'

const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

const notFoundSchema = z.object({ message: z.string() })

const idParam = z.object({ id: z.uuid({ version: 'v4' }) })

const userBody = z.object({
  email: z.email(),
  name: z.string().min(1),
  password: z.string().min(8),
})

type Options = { service: UsersService }

export const usersRouter: FastifyPluginAsyncZod<Options> = async (fastify, { service }) => {
  fastify.get('/users', { schema: { response: { 200: z.array(userSchema) } } }, async () =>
    service.list(),
  )

  fastify.put(
    '/users/:id',
    {
      schema: {
        params: idParam,
        body: userBody,
        response: { 200: userSchema, 201: userSchema, 404: notFoundSchema },
      },
    },
    async (req, reply) => {
      const { user, created } = await service.upsert(req.params.id, req.body)
      return reply.code(created ? 201 : 200).send(user)
    },
  )

  fastify.get(
    '/users/:id',
    { schema: { params: idParam, response: { 200: userSchema, 404: notFoundSchema } } },
    async (req, reply) => {
      const user = await service.get(req.params.id)
      if (!user) return reply.code(404).send({ message: 'User not found' })
      return user
    },
  )

  fastify.patch(
    '/users/:id',
    {
      schema: {
        params: idParam,
        body: userBody
          .partial()
          .refine(
            (b) => b.email !== undefined || b.name !== undefined || b.password !== undefined,
            { error: 'At least one field must be provided' },
          ),
        response: { 200: userSchema, 404: notFoundSchema },
      },
    },
    async (req, reply) => {
      const user = await service.update(req.params.id, req.body)
      if (!user) return reply.code(404).send({ message: 'User not found' })
      return user
    },
  )

  fastify.delete(
    '/users/:id',
    { schema: { params: idParam, response: { 204: z.void(), 404: notFoundSchema } } },
    async (req, reply) => {
      const user = await service.remove(req.params.id)
      if (!user) return reply.code(404).send({ message: 'User not found' })
      return reply.code(204).send()
    },
  )
}
