import { Server } from 'node:http'
import { PingEvent, PlayGameEvent } from 'shared/src/schemas/playerEvents'
import {
  gameStartedEventSchema,
  playerConnectedEventSchema,
  pongEventSchema,
  unparsableErrorEventSchema,
  waitingForGameEventSchema,
} from 'shared/src/schemas/serverEvents'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { state } from '../src/core/state'
import { startServer, TestWebSocket } from './webSocketTestUtils'

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
    const player = new TestWebSocket('player', url)
    await player.waitUntil('open')

    const pingEvent: PingEvent = {
      event: 'ping',
    }

    await player.waitForEventSchema(playerConnectedEventSchema)

    player.send(JSON.stringify(pingEvent))
    await player.waitForEventSchema(pongEventSchema)

    player.close()
  })

  test('New players wants to play a game', async () => {
    const player1 = new TestWebSocket('player1', url)
    const player2 = new TestWebSocket('player2', url)
    const player3 = new TestWebSocket('player3', url)
    const player4 = new TestWebSocket('player4', url)

    await player1.waitUntil('open')
    await player2.waitUntil('open')
    await player3.waitUntil('open')
    await player4.waitUntil('open')

    expect(state.waitingPlayers.size).toBe(0)

    const playGameEvent: PlayGameEvent = {
      event: 'playGame',
    }

    player1.send(JSON.stringify(playGameEvent))
    await player1.waitForEventSchema(waitingForGameEventSchema)

    expect(state.waitingPlayers.size).toBe(1)

    player2.send(JSON.stringify(playGameEvent))
    await player2.waitForEventSchema(waitingForGameEventSchema)

    expect(state.waitingPlayers.size).toBe(2)

    player3.send(JSON.stringify(playGameEvent))
    await player3.waitForEventSchema(waitingForGameEventSchema)

    expect(state.waitingPlayers.size).toBe(3)

    player4.send(JSON.stringify(playGameEvent))

    await player1.waitForEventSchema(gameStartedEventSchema)
    await player2.waitForEventSchema(gameStartedEventSchema)
    await player3.waitForEventSchema(gameStartedEventSchema)
    await player4.waitForEventSchema(gameStartedEventSchema)
    expect(state.waitingPlayers.size).toBe(0)

    player1.close()
    player2.close()
    player3.close()
    player4.close()
  })

  test('Player sending a wrong message to the server receives an unparsable error', async () => {
    const player = new TestWebSocket('player', url)
    await player.waitUntil('open')

    const wrongEvent = {
      event: 'wrongMessageEvent',
    }

    player.send(JSON.stringify(wrongEvent))
    await player.waitForEventSchema(unparsableErrorEventSchema)

    player.close()
  })
})
