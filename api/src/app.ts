import {
  ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from '@fastify/type-provider-zod'
import Fastify from 'fastify'
import { healthRoutes } from './routes/health.js'

export function createApp() {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  void app.register(healthRoutes)

  return app
}
