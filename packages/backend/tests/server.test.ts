import { Server } from 'node:http'
import {
  ServerMessageError,
  UnparsableMessageError,
} from 'shared/src/errors/webSocketMessage.js'
import {
  ServerMessage,
  UserMessage,
} from 'shared/src/schemas/webSocketMessage.js'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { state } from '../src/core/state.js'
import { startServer, TestWebSocket } from './webSocketTestUtils.js'

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
    const player = new TestWebSocket(url)
    await player.waitUntil('open')

    const pingMessage: UserMessage = {
      event: 'ping',
    }
    const expectedMessageFromServer: ServerMessage = {
      event: 'pong',
    }

    player.send(JSON.stringify(pingMessage))
    await player.waitForMessage(JSON.stringify(expectedMessageFromServer))

    player.close()
  })

  test('New players want to play a game', async () => {
    const player1 = new TestWebSocket(url)
    const player2 = new TestWebSocket(url)
    const player3 = new TestWebSocket(url)

    await player1.waitUntil('open')
    await player2.waitUntil('open')
    await player3.waitUntil('open')

    expect(state.waitingPlayers.size).toBe(0)

    const playGameMessage: UserMessage = {
      event: 'playGame',
    }
    const expectedWaitingForGameMessageFromServer: ServerMessage = {
      event: 'waitingForGame',
    }

    player1.send(JSON.stringify(playGameMessage))
    await player1.waitForMessage(
      JSON.stringify(expectedWaitingForGameMessageFromServer),
    )

    expect(state.waitingPlayers.size).toBe(1)

    player2.send(JSON.stringify(playGameMessage))
    await player2.waitForMessage(
      JSON.stringify(expectedWaitingForGameMessageFromServer),
    )

    expect(state.waitingPlayers.size).toBe(2)

    player3.send(JSON.stringify(playGameMessage))
    await player3.waitForMessage(
      JSON.stringify(expectedWaitingForGameMessageFromServer),
    )

    expect(state.waitingPlayers.size).toBe(3)

    player1.close()
    player2.close()
    player3.close()
  })

  test('Player sending a wrong message to the server receives an unparsable error', async () => {
    const player = new TestWebSocket(url)
    await player.waitUntil('open')

    const wrongMessage = {
      event: 'wrongMessageEvent',
    }
    const expectedMessageFromServer: ServerMessageError<UnparsableMessageError> =
      {
        _tag: 'UnparsableMessageError',
        message: `Unable to parse message from player`,
      }

    player.send(JSON.stringify(wrongMessage))
    await player.waitForMessage(JSON.stringify(expectedMessageFromServer))

    player.close()
  })
})
