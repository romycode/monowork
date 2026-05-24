import { createServer } from 'node:http'

const PORT = Number(process.env['PORT'] ?? 3000)

const server = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ status: 'ok' }))
})

server.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`)
})
