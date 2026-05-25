import type {UsersRepository} from '#/db/users-repository'
import type {FastifyPluginAsyncZod} from '@fastify/type-provider-zod'
import {z} from 'zod'

const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

const notFoundSchema = z.object({ message: z.string() })

const idParam = z.object({ id: z.uuid({ version: "v4" }) })

type Options = { repo: UsersRepository }

export const usersRoutes: FastifyPluginAsyncZod<Options> = async (fastify, { repo }) => {
  fastify.get('/users', { schema: { response: { 200: z.array(userSchema) } } }, async () =>
    repo.findAll(),
  )

  fastify.post(
    '/users',
    {
      schema: {
        body: z.object({
          email: z.string().email(),
          name: z.string().min(1),
          password: z.string().min(8),
        }),
        response: { 201: userSchema },
      },
    },
    async (req, reply) => {
      const user = await repo.create(req.body)
      return reply.code(201).send(user)
    },
  )

  fastify.get(
    '/users/:id',
    { schema: { params: idParam, response: { 200: userSchema, 404: notFoundSchema } } },
    async (req, reply) => {
      const user = await repo.findById(req.params.id)
      if (!user) return reply.code(404).send({ message: 'User not found' })
      return user
    },
  )

  fastify.put(
    '/users/:id',
    {
      schema: {
        params: idParam,
        body: z
          .object({
            email: z.string().email(),
            name: z.string().min(1),
            password: z.string().min(8),
          })
          .partial()
          .refine(
            (b) => b.email !== undefined || b.name !== undefined || b.password !== undefined,
            {
              message: 'At least one field must be provided',
            },
          ),
        response: { 200: userSchema, 404: notFoundSchema },
      },
    },
    async (req, reply) => {
      const user = await repo.update(req.params.id, req.body)
      if (!user) return reply.code(404).send({ message: 'User not found' })
      return user
    },
  )

  fastify.delete(
    '/users/:id',
    { schema: { params: idParam, response: { 204: z.void(), 404: notFoundSchema } } },
    async (req, reply) => {
      const user = await repo.remove(req.params.id)
      if (!user) return reply.code(404).send({ message: 'User not found' })
      return reply.code(204).send()
    },
  )
}
