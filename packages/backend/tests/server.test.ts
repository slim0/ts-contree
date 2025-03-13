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
    const player1Connection = new TestWebSocket('player1', url)
    const player2Connection = new TestWebSocket('player2', url)
    const player3Connection = new TestWebSocket('player3', url)
    const player4Connection = new TestWebSocket('player4', url)

    await player1Connection.waitUntil('open')
    const player1ConnectedMessage = await player1Connection.waitForEventSchema(
      playerConnectedEventSchema,
    )
    const player1 = player1ConnectedMessage.data
    expect(state.players.get(player1.uuid)?.status).toBe('connected')

    await player2Connection.waitUntil('open')
    const player2ConnectedMessage = await player2Connection.waitForEventSchema(
      playerConnectedEventSchema,
    )
    const player2 = player2ConnectedMessage.data
    expect(state.players.get(player2.uuid)?.status).toBe('connected')

    await player3Connection.waitUntil('open')
    const player3ConnectedMessage = await player3Connection.waitForEventSchema(
      playerConnectedEventSchema,
    )
    const player3 = player3ConnectedMessage.data
    expect(state.players.get(player3.uuid)?.status).toBe('connected')

    await player4Connection.waitUntil('open')
    const player4ConnectedMessage = await player4Connection.waitForEventSchema(
      playerConnectedEventSchema,
    )
    const player4 = player4ConnectedMessage.data
    expect(state.players.get(player4.uuid)?.status).toBe('connected')

    expect(state.players.size).toBe(4)

    const playGameEvent: PlayGameEvent = {
      _tag: 'PlayGameEvent',
    }

    player1Connection.send(JSON.stringify(playGameEvent))
    await player1Connection.waitForEventSchema(waitingForGameEventSchema)
    expect(state.players.get(player1.uuid)?.status).toBe('waitingForGame')

    player2Connection.send(JSON.stringify(playGameEvent))
    await player2Connection.waitForEventSchema(waitingForGameEventSchema)
    expect(state.players.get(player2.uuid)?.status).toBe('waitingForGame')

    player3Connection.send(JSON.stringify(playGameEvent))
    await player3Connection.waitForEventSchema(waitingForGameEventSchema)
    expect(state.players.get(player3.uuid)?.status).toBe('waitingForGame')

    player4Connection.send(JSON.stringify(playGameEvent))

    const player1GameStartedEvent = await player1Connection.waitForEventSchema(
      gameStartedEventSchema,
    )
    expect(state.players.get(player1.uuid)?.status).toBe('playing')
    expect(player1GameStartedEvent.data.asset).toBe(undefined)
    expect(player1GameStartedEvent.data.hand.length).toBe(0) // TODO: toBe 8
    expect(player1GameStartedEvent.data.game.teams[0].score).toBe(0)
    expect(player1GameStartedEvent.data.game.teams[1].score).toBe(0)
    expect(player1GameStartedEvent.data.game.teams[0].players).toStrictEqual([
      player1,
      player3,
    ])
    expect(player1GameStartedEvent.data.game.teams[1].players).toStrictEqual([
      player2,
      player4,
    ])
    expect(player1GameStartedEvent.data.game.playerOrder).toStrictEqual([
      player1,
      player2,
      player3,
      player4,
    ])

    const player2GameStartedEvent = await player2Connection.waitForEventSchema(
      gameStartedEventSchema,
    )
    expect(state.players.get(player2.uuid)?.status).toBe('playing')
    expect(player2GameStartedEvent.data.asset).toBe(undefined)
    expect(player2GameStartedEvent.data.hand.length).toBe(0)
    expect(player2GameStartedEvent.data.game).toStrictEqual(
      player1GameStartedEvent.data.game,
    )

    const player3GameStartedEvent = await player3Connection.waitForEventSchema(
      gameStartedEventSchema,
    )
    expect(state.players.get(player3.uuid)?.status).toBe('playing')
    expect(player3GameStartedEvent.data.asset).toBe(undefined)
    expect(player3GameStartedEvent.data.hand.length).toBe(0)
    expect(player3GameStartedEvent.data.game).toStrictEqual(
      player1GameStartedEvent.data.game,
    )

    const player4GameStartedEvent = await player4Connection.waitForEventSchema(
      gameStartedEventSchema,
    )
    expect(state.players.get(player4.uuid)?.status).toBe('playing')
    expect(state.players.get(player3.uuid)?.status).toBe('playing')
    expect(state.players.get(player2.uuid)?.status).toBe('playing')
    expect(player4GameStartedEvent.data.asset).toBe(undefined)
    expect(player4GameStartedEvent.data.hand.length).toBe(0)
    expect(player4GameStartedEvent.data.game).toStrictEqual(
      player1GameStartedEvent.data.game,
    )

    player1Connection.close()
    player2Connection.close()
    player3Connection.close()
    player4Connection.close()
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
