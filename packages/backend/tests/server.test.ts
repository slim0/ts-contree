import { Server } from 'node:http'

import {
  PingMessage,
  PlayGameMessage,
} from 'shared/src/messages/player/playerMessages'
import {
  gameStartedMessageSchema,
  playerConnectedMessageSchema,
  pongMessageSchema,
  unparsablePlayerErrorMessageSchema,
  waitingForGameMessageSchema,
} from 'shared/src/messages/server/serverMessages'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { playersState } from '../src/core/database/players'
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
    await player.waitForEventSchema(playerConnectedMessageSchema)

    const pingMessage: PingMessage = {
      _tag: 'PingMessage',
    }

    player.send(JSON.stringify(pingMessage))
    await player.waitForEventSchema(pongMessageSchema)

    player.close()
  })

  test('New players wants to play a game', async () => {
    const player1Connection = new TestWebSocket('player1', url)
    const player2Connection = new TestWebSocket('player2', url)
    const player3Connection = new TestWebSocket('player3', url)
    const player4Connection = new TestWebSocket('player4', url)

    await player1Connection.waitUntil('open')
    const player1ConnectedMessage = await player1Connection.waitForEventSchema(
      playerConnectedMessageSchema,
    )
    const player1 = player1ConnectedMessage.data
    expect(playersState.get(player1.uuid)?.status).toBe('connected')

    await player2Connection.waitUntil('open')
    const player2ConnectedMessage = await player2Connection.waitForEventSchema(
      playerConnectedMessageSchema,
    )
    const player2 = player2ConnectedMessage.data
    expect(playersState.get(player2.uuid)?.status).toBe('connected')

    await player3Connection.waitUntil('open')
    const player3ConnectedMessage = await player3Connection.waitForEventSchema(
      playerConnectedMessageSchema,
    )
    const player3 = player3ConnectedMessage.data
    expect(playersState.get(player3.uuid)?.status).toBe('connected')

    await player4Connection.waitUntil('open')
    const player4ConnectedMessage = await player4Connection.waitForEventSchema(
      playerConnectedMessageSchema,
    )
    const player4 = player4ConnectedMessage.data
    expect(playersState.get(player4.uuid)?.status).toBe('connected')

    expect(playersState.size).toBe(4)

    const playGameMessage: PlayGameMessage = {
      _tag: 'PlayGameMessage',
    }

    player1Connection.send(JSON.stringify(playGameMessage))
    await player1Connection.waitForEventSchema(waitingForGameMessageSchema)
    expect(playersState.get(player1.uuid)?.status).toBe('waitingForGame')

    player2Connection.send(JSON.stringify(playGameMessage))
    await player2Connection.waitForEventSchema(waitingForGameMessageSchema)
    expect(playersState.get(player2.uuid)?.status).toBe('waitingForGame')

    player3Connection.send(JSON.stringify(playGameMessage))
    await player3Connection.waitForEventSchema(waitingForGameMessageSchema)
    expect(playersState.get(player3.uuid)?.status).toBe('waitingForGame')

    player4Connection.send(JSON.stringify(playGameMessage))

    const player1GameStartedEvent = await player1Connection.waitForEventSchema(
      gameStartedMessageSchema,
      true,
    )
    expect(playersState.get(player1.uuid)?.status).toBe('playing')
    expect(player1GameStartedEvent.data.game.currentParty.asset).toBe(null)
    expect(player1GameStartedEvent.data.game.currentParty.folds.length).toBe(0)
    expect(
      player1GameStartedEvent.data.game.currentParty.indexCurrentPlayer,
    ).toBe(0)
    expect(player1GameStartedEvent.data.game.currentParty.status).toBe('start')

    expect(player1GameStartedEvent.data.game.status).toBe('start')

    expect(player1GameStartedEvent.data.game.teamA.score).toBe(0)
    expect(player1GameStartedEvent.data.game.teamA.name).toBe('Red Devil')
    expect(player1GameStartedEvent.data.game.teamA.player1.uuid).toBe(
      player1.uuid,
    )
    expect(player1GameStartedEvent.data.game.teamA.player2.uuid).toBe(
      player2.uuid,
    )

    expect(player1GameStartedEvent.data.game.teamB.score).toBe(0)
    expect(player1GameStartedEvent.data.game.teamB.name).toBe('Black Mamba')
    expect(player1GameStartedEvent.data.game.teamB.player1.uuid).toBe(
      player3.uuid,
    )
    expect(player1GameStartedEvent.data.game.teamB.player2.uuid).toBe(
      player4.uuid,
    )

    const player2GameStartedEvent = await player2Connection.waitForEventSchema(
      gameStartedMessageSchema,
    )
    expect(playersState.get(player2.uuid)?.status).toBe('playing')
    expect(player2GameStartedEvent.data.game).toStrictEqual(
      player1GameStartedEvent.data.game,
    )
    // expect(player2GameStartedEvent.data.asset).toBe(undefined)
    // expect(player2GameStartedEvent.data.hand.length).toBe(8)
    // expect(player2GameStartedEvent.data.game).toStrictEqual(
    //   player1GameStartedEvent.data.game,
    // )

    const player3GameStartedEvent = await player3Connection.waitForEventSchema(
      gameStartedMessageSchema,
    )
    expect(playersState.get(player3.uuid)?.status).toBe('playing')
    expect(player3GameStartedEvent.data.game).toStrictEqual(
      player1GameStartedEvent.data.game,
    )
    // expect(player3GameStartedEvent.data.asset).toBe(undefined)
    // expect(player3GameStartedEvent.data.hand.length).toBe(8)
    // expect(player3GameStartedEvent.data.game).toStrictEqual(
    //   player1GameStartedEvent.data.game,
    // )

    const player4GameStartedEvent = await player4Connection.waitForEventSchema(
      gameStartedMessageSchema,
    )
    expect(playersState.get(player4.uuid)?.status).toBe('playing')
    expect(player4GameStartedEvent.data.game).toStrictEqual(
      player1GameStartedEvent.data.game,
    )
    // expect(player4GameStartedEvent.data.asset).toBe(undefined)
    // expect(player4GameStartedEvent.data.hand.length).toBe(8)
    // expect(player4GameStartedEvent.data.game).toStrictEqual(
    //   player1GameStartedEvent.data.game,
    // )

    // const distributedCardsStrings = new Set(
    //   player1GameStartedEvent.data.hand
    //     .concat(player2GameStartedEvent.data.hand)
    //     .concat(player3GameStartedEvent.data.hand)
    //     .concat(player4GameStartedEvent.data.hand)
    //     .map((card) => stringifyCard(card)),
    // )

    // const deckOf32CardsStrings = new Set(
    //   deckOf32Cards.map((card) => stringifyCard(card)),
    // )
    // const intersection = new Set(
    //   [...distributedCardsStrings].filter((x) => deckOf32CardsStrings.has(x)),
    // )

    // expect(distributedCardsStrings.size).toBe(deckOf32Cards.length)
    // expect(intersection.size).toBe(deckOf32Cards.length)

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
    await player.waitForEventSchema(unparsablePlayerErrorMessageSchema)

    player.close()
  })
})
