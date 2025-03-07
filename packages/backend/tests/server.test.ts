import { beforeAll, afterAll, describe, test } from 'vitest'
import { startServer, TestWebSocket } from './webSocketTestUtils.js'
import { Server } from 'node:http'
import { expect } from 'vitest'

const port = 3001
const url = `ws://localhost:${port}`

describe('WebSocket Server', () => {
  let server: Server

  beforeAll(async () => {
    server = await startServer(port)
  })

  afterAll(() => {
    server.close()
  })

  test('ping pong end-to-end test', async () => {
    const client = new TestWebSocket(url)
    await client.waitUntil('open')
    const jsonMessage = JSON.stringify({ event: 'ping' })

    const responseMessage = await new Promise<string>((resolve) => {
      client.addEventListener('message', ({ data }) => resolve(data), {
        once: true,
      })

      client.send(jsonMessage)
    })

    expect(JSON.parse(responseMessage)).toStrictEqual({
      message: 'pong',
      data: null,
    })

    client.close()
  })
})
