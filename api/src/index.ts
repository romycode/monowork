import {createApp} from '#/app'
import {env} from '#/env'

const app = createApp()
await app.listen({ port: env.PORT, host: '0.0.0.0' })

const shutdown = async () => {
  await app.close()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
