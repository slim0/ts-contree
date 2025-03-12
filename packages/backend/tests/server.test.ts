import { Server } from 'node:http'
import {
  PingEvent,
  PlayGameEvent,
} from 'shared/src/eventSchemas/player/playerEvents'
import {
  gameStartedEventSchema,
  playerConnectedEventSchema,
  pongEventSchema,
  unparsableErrorEventSchema,
  waitingForGameEventSchema,
} from 'shared/src/eventSchemas/server/serverEvents'
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
    await player.waitForEventSchema(playerConnectedEventSchema)

    const pingEvent: PingEvent = {
      _tag: 'PingEvent',
    }

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
    await player1.waitForEventSchema(playerConnectedEventSchema)

    await player2.waitUntil('open')
    await player2.waitForEventSchema(playerConnectedEventSchema)

    await player3.waitUntil('open')
    await player3.waitForEventSchema(playerConnectedEventSchema)

    await player4.waitUntil('open')
    await player4.waitForEventSchema(playerConnectedEventSchema)

    expect(state.players.size).toBe(4)

    const playGameEvent: PlayGameEvent = {
      _tag: 'PlayGameEvent',
    }

    player1.send(JSON.stringify(playGameEvent))
    await player1.waitForEventSchema(waitingForGameEventSchema)

    player2.send(JSON.stringify(playGameEvent))
    await player2.waitForEventSchema(waitingForGameEventSchema)

    player3.send(JSON.stringify(playGameEvent))
    await player3.waitForEventSchema(waitingForGameEventSchema)

    player4.send(JSON.stringify(playGameEvent))

    await player1.waitForEventSchema(gameStartedEventSchema)
    await player2.waitForEventSchema(gameStartedEventSchema)
    await player3.waitForEventSchema(gameStartedEventSchema)
    await player4.waitForEventSchema(gameStartedEventSchema)

    player1.close()
    player2.close()
    player3.close()
    player4.close()
  })

  test('Player sending a wrong message to the server receives an unparsable error', async () => {
    const player = new TestWebSocket('player', url)
    await player.waitUntil('open')

    const wrongEvent = {
      _tag: 'WrongMessageEvent',
    }

    player.send(JSON.stringify(wrongEvent))
    await player.waitForEventSchema(unparsableErrorEventSchema)

    player.close()
  })
})
