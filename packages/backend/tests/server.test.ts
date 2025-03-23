import { Server } from 'node:http'

import {
  deckOf32Cards,
  uniqueNameFromCard,
} from 'shared/src/messages/datas/cards'
import { Party, PartyUUID } from 'shared/src/messages/datas/party'
import {
  BidMessage,
  PingMessage,
  PlayGameMessage,
} from 'shared/src/messages/player/playerMessages'
import {
  newBidMessageSchema,
  newPartyMessageSchema,
  notYourTurnErrorMessageSchema,
  pendingGameMessageSchema,
  playerConnectedMessageSchema,
  playerStatusErrorMessageSchema,
  pongMessageSchema,
  stateNotFoundErrorMessageSchema,
  unparsablePlayerErrorMessageSchema,
  waitingForGameMessageSchema,
} from 'shared/src/messages/server/serverMessages'
import { v4 as uuidv4 } from 'uuid'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { partiesState } from '../src/core/database/parties'
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
    await player.waitForMessageSchema(playerConnectedMessageSchema)

    const pingMessage: PingMessage = {
      _tag: 'PingMessage',
    }

    player.send(JSON.stringify(pingMessage))
    await player.waitForMessageSchema(pongMessageSchema)

    player.close()
  })

  test('New players wants to play a game', async () => {
    const player1Connection = new TestWebSocket('player1', url)
    const player2Connection = new TestWebSocket('player2', url)
    const player3Connection = new TestWebSocket('player3', url)
    const player4Connection = new TestWebSocket('player4', url)

    // Test players connection

    await player1Connection.waitUntil('open')
    const player1ConnectedMessage =
      await player1Connection.waitForMessageSchema(playerConnectedMessageSchema)
    const player1 = player1ConnectedMessage.data
    expect(playersState.get(player1.uuid)?.status).toBe('connected')

    await player2Connection.waitUntil('open')
    const player2ConnectedMessage =
      await player2Connection.waitForMessageSchema(playerConnectedMessageSchema)
    const player2 = player2ConnectedMessage.data
    expect(playersState.get(player2.uuid)?.status).toBe('connected')

    await player3Connection.waitUntil('open')
    const player3ConnectedMessage =
      await player3Connection.waitForMessageSchema(playerConnectedMessageSchema)
    const player3 = player3ConnectedMessage.data
    expect(playersState.get(player3.uuid)?.status).toBe('connected')

    await player4Connection.waitUntil('open')
    const player4ConnectedMessage =
      await player4Connection.waitForMessageSchema(playerConnectedMessageSchema)
    const player4 = player4ConnectedMessage.data
    expect(playersState.get(player4.uuid)?.status).toBe('connected')

    expect(playersState.size).toBe(4)

    // Test players want to play a game

    const playGameMessage: PlayGameMessage = {
      _tag: 'PlayGameMessage',
    }

    player1Connection.send(JSON.stringify(playGameMessage))
    await player1Connection.waitForMessageSchema(waitingForGameMessageSchema)
    expect(playersState.get(player1.uuid)?.status).toBe('waitingForGame')

    player1Connection.send(JSON.stringify(playGameMessage))
    await player1Connection.waitForMessageSchema(playerStatusErrorMessageSchema)
    expect(playersState.get(player1.uuid)?.status).toBe('waitingForGame')

    player2Connection.send(JSON.stringify(playGameMessage))
    await player2Connection.waitForMessageSchema(waitingForGameMessageSchema)
    expect(playersState.get(player2.uuid)?.status).toBe('waitingForGame')

    player3Connection.send(JSON.stringify(playGameMessage))
    await player3Connection.waitForMessageSchema(waitingForGameMessageSchema)
    expect(playersState.get(player3.uuid)?.status).toBe('waitingForGame')

    player4Connection.send(JSON.stringify(playGameMessage))

    // Test started game

    const player1PendingGameMessage =
      await player1Connection.waitForMessageSchema(pendingGameMessageSchema)
    expect(playersState.get(player1.uuid)?.status).toBe('playing')
    testPartyIsNew(player1PendingGameMessage.data.party)

    expect(player1PendingGameMessage.data.game.status).toBe('start')
    expect(player1PendingGameMessage.data.teamA.score).toBe(0)
    expect(player1PendingGameMessage.data.teamA.name).toBe('Red Devil')
    expect(player1PendingGameMessage.data.teamA.player1_UUID).toBe(player1.uuid)
    expect(player1PendingGameMessage.data.teamA.player2_UUID).toBe(player3.uuid)

    expect(player1PendingGameMessage.data.teamB.score).toBe(0)
    expect(player1PendingGameMessage.data.teamB.name).toBe('Black Mamba')
    expect(player1PendingGameMessage.data.teamB.player1_UUID).toBe(player2.uuid)
    expect(player1PendingGameMessage.data.teamB.player2_UUID).toBe(player4.uuid)
    expect(player1PendingGameMessage.data.hand.length).toBe(8)

    const player2PendingGameMessage =
      await player2Connection.waitForMessageSchema(pendingGameMessageSchema)
    expect(playersState.get(player2.uuid)?.status).toBe('playing')
    expect(player2PendingGameMessage.data.game).toStrictEqual(
      player1PendingGameMessage.data.game,
    )
    expect(player2PendingGameMessage.data.hand.length).toBe(8)

    const player3PendingGameMessage =
      await player3Connection.waitForMessageSchema(pendingGameMessageSchema)
    expect(playersState.get(player3.uuid)?.status).toBe('playing')
    expect(player3PendingGameMessage.data.game).toStrictEqual(
      player1PendingGameMessage.data.game,
    )
    expect(player3PendingGameMessage.data.hand.length).toBe(8)

    const player4PendingGameMessage =
      await player4Connection.waitForMessageSchema(pendingGameMessageSchema)
    expect(playersState.get(player4.uuid)?.status).toBe('playing')
    expect(player4PendingGameMessage.data.game).toStrictEqual(
      player1PendingGameMessage.data.game,
    )
    expect(player4PendingGameMessage.data.hand.length).toBe(8)

    // Test all cards are being distributed among players
    const distributedCardsStrings = new Set(
      player1PendingGameMessage.data.hand
        .concat(player2PendingGameMessage.data.hand)
        .concat(player3PendingGameMessage.data.hand)
        .concat(player4PendingGameMessage.data.hand)
        .map((card) => uniqueNameFromCard(card)),
    )
    expect(
      distributedCardsStrings.size,
      'Some players have at least one card in common',
    ).toBe(deckOf32Cards.length)

    player1Connection.send(JSON.stringify(playGameMessage))
    await player1Connection.waitForMessageSchema(playerStatusErrorMessageSchema)
    expect(playersState.get(player1.uuid)?.status).toBe('playing')

    const partyUUID = player1PendingGameMessage.data.party.uuid

    // Test sending wrong partyUUID
    const wrongBidMessage: BidMessage = {
      _tag: 'BidMessage',
      data: {
        partyUUID: uuidv4() as PartyUUID,
        bet: {
          asset: 'clubs',
          betScore: 80,
        },
      },
    }
    player1Connection.send(JSON.stringify(wrongBidMessage))
    await player1Connection.waitForMessageSchema(
      stateNotFoundErrorMessageSchema,
    )
    expect(partiesState.get(partyUUID)?.indexCurrentPlayer).toBe(0)
    expect(partiesState.get(partyUUID)?.nullBidInARow).toBe(0)

    // Test player 2 trying to play before player 1
    const wrongBidMessage2: BidMessage = {
      _tag: 'BidMessage',
      data: {
        partyUUID,
        bet: {
          asset: 'clubs',
          betScore: 80,
        },
      },
    }
    player2Connection.send(JSON.stringify(wrongBidMessage2))
    await player2Connection.waitForMessageSchema(notYourTurnErrorMessageSchema)
    expect(partiesState.get(partyUUID)?.indexCurrentPlayer).toBe(0)
    expect(partiesState.get(partyUUID)?.nullBidInARow).toBe(0)

    // Player 1 decide not to bet
    const bidMessageNotBet: BidMessage = {
      _tag: 'BidMessage',
      data: {
        partyUUID,
        bet: null,
      },
    }
    player1Connection.send(JSON.stringify(bidMessageNotBet))
    const nullBidFromPlayer1 =
      await player1Connection.waitForMessageSchema(newBidMessageSchema)
    const nullBidFromPlayer1ToPlayer2 =
      await player2Connection.waitForMessageSchema(newBidMessageSchema)
    const nullBidFromPlayer1ToPlayer3 =
      await player3Connection.waitForMessageSchema(newBidMessageSchema)
    const nullBidFromPlayer1ToPlayer4 =
      await player4Connection.waitForMessageSchema(newBidMessageSchema)

    expect(nullBidFromPlayer1.data.bid).toBeNull
    expect(partiesState.get(partyUUID)?.indexCurrentPlayer).toBe(1)
    expect(partiesState.get(partyUUID)?.nullBidInARow).toBe(1)
    expect(nullBidFromPlayer1).toStrictEqual(nullBidFromPlayer1ToPlayer2)
    expect(nullBidFromPlayer1).toStrictEqual(nullBidFromPlayer1ToPlayer3)
    expect(nullBidFromPlayer1).toStrictEqual(nullBidFromPlayer1ToPlayer4)

    // Test player 1 trying to play instead of player 2
    player1Connection.send(JSON.stringify(wrongBidMessage2))
    await player1Connection.waitForMessageSchema(notYourTurnErrorMessageSchema)
    expect(partiesState.get(partyUUID)?.indexCurrentPlayer).toBe(1)
    expect(partiesState.get(partyUUID)?.nullBidInARow).toBe(1)

    // Test player 3 trying to play instead of player 2
    player3Connection.send(JSON.stringify(wrongBidMessage2))
    await player3Connection.waitForMessageSchema(notYourTurnErrorMessageSchema)
    expect(partiesState.get(partyUUID)?.indexCurrentPlayer).toBe(1)
    expect(partiesState.get(partyUUID)?.nullBidInARow).toBe(1)

    player1Connection.clearMessages()
    player2Connection.clearMessages()
    player3Connection.clearMessages()
    player4Connection.clearMessages()

    // Player 2 decide not to bet
    player2Connection.send(JSON.stringify(bidMessageNotBet))
    const nullBidFromPlayer2 =
      await player2Connection.waitForMessageSchema(newBidMessageSchema)
    const nullBidFromPlayer2ToPlayer2 =
      await player1Connection.waitForMessageSchema(newBidMessageSchema)
    const nullBidFromPlayer2ToPlayer3 =
      await player3Connection.waitForMessageSchema(newBidMessageSchema)
    const nullBidFromPlayer2ToPlayer4 =
      await player4Connection.waitForMessageSchema(newBidMessageSchema)
    expect(nullBidFromPlayer2.data.bid).toBeNull
    expect(partiesState.get(partyUUID)?.indexCurrentPlayer).toBe(2)
    expect(partiesState.get(partyUUID)?.nullBidInARow).toBe(2)
    expect(nullBidFromPlayer2).toStrictEqual(nullBidFromPlayer2ToPlayer2)
    expect(nullBidFromPlayer2).toStrictEqual(nullBidFromPlayer2ToPlayer3)
    expect(nullBidFromPlayer2).toStrictEqual(nullBidFromPlayer2ToPlayer4)

    player1Connection.clearMessages()
    player2Connection.clearMessages()
    player3Connection.clearMessages()
    player4Connection.clearMessages()

    // Player 3 decide not to bet
    player3Connection.send(JSON.stringify(bidMessageNotBet))
    const nullBidFromPlayer3 =
      await player3Connection.waitForMessageSchema(newBidMessageSchema)
    const nullBidFromPlayer3ToPlayer2 =
      await player1Connection.waitForMessageSchema(newBidMessageSchema)
    const nullBidFromPlayer3ToPlayer3 =
      await player2Connection.waitForMessageSchema(newBidMessageSchema)
    const nullBidFromPlayer3ToPlayer4 =
      await player4Connection.waitForMessageSchema(newBidMessageSchema)
    expect(nullBidFromPlayer3.data.bid).toBeNull
    expect(partiesState.get(partyUUID)?.indexCurrentPlayer).toBe(3)
    expect(partiesState.get(partyUUID)?.nullBidInARow).toBe(3)
    expect(nullBidFromPlayer3).toStrictEqual(nullBidFromPlayer3ToPlayer2)
    expect(nullBidFromPlayer3).toStrictEqual(nullBidFromPlayer3ToPlayer3)
    expect(nullBidFromPlayer3).toStrictEqual(nullBidFromPlayer3ToPlayer4)

    player1Connection.clearMessages()
    player2Connection.clearMessages()
    player3Connection.clearMessages()
    player4Connection.clearMessages()

    // Player 4 decide not to bet
    player4Connection.send(JSON.stringify(bidMessageNotBet))
    const newPartyMessagePlayer4 = await player4Connection.waitForMessageSchema(
      newPartyMessageSchema,
    )
    const newPartyMessagePlayer1 = await player1Connection.waitForMessageSchema(
      newPartyMessageSchema,
    )
    const newPartyMessagePlayer2 = await player2Connection.waitForMessageSchema(
      newPartyMessageSchema,
    )
    const newPartyMessagePlayer3 = await player3Connection.waitForMessageSchema(
      newPartyMessageSchema,
    )
    expect(partiesState.get(partyUUID)).toBe(undefined)
    testPartyIsNew(newPartyMessagePlayer4.data.party)
    expect(newPartyMessagePlayer4).toStrictEqual(newPartyMessagePlayer1)
    expect(newPartyMessagePlayer4).toStrictEqual(newPartyMessagePlayer2)
    expect(newPartyMessagePlayer4).toStrictEqual(newPartyMessagePlayer3)

    const newParty = newPartyMessagePlayer4.data.party

    // test player 1 decide to bet
    const player1BidMessage: BidMessage = {
      _tag: 'BidMessage',
      data: {
        partyUUID: newParty.uuid,
        bet: {
          asset: 'clubs',
          betScore: 80,
        },
      },
    }
    player1Connection.send(JSON.stringify(player1BidMessage))
    const bidMessageResponseToPlayer1 =
      await player1Connection.waitForMessageSchema(newBidMessageSchema)
    expect(bidMessageResponseToPlayer1.data.bid).not.toBeNull
    expect(bidMessageResponseToPlayer1.data.bid?.partyUUID).toBe(newParty.uuid)
    expect(bidMessageResponseToPlayer1.data.bid?.bet).toStrictEqual({
      asset: 'clubs',
      betScore: 80,
    })

    const bidMessageResponseToPlayer2 =
      await player2Connection.waitForMessageSchema(newBidMessageSchema)
    const bidMessageResponseToPlayer3 =
      await player3Connection.waitForMessageSchema(newBidMessageSchema)
    const bidMessageResponseToPlayer4 =
      await player4Connection.waitForMessageSchema(newBidMessageSchema)

    expect(bidMessageResponseToPlayer1).toStrictEqual(
      bidMessageResponseToPlayer2,
    )
    expect(bidMessageResponseToPlayer1).toStrictEqual(
      bidMessageResponseToPlayer3,
    )
    expect(bidMessageResponseToPlayer1).toStrictEqual(
      bidMessageResponseToPlayer4,
    )

    // Close connections
    player1Connection.close()
    player2Connection.close()
    player3Connection.close()
    player4Connection.close()
  })

  test('Player sending a wrong message to the server receives an unparsable error', async () => {
    const player = new TestWebSocket('player', url)
    await player.waitUntil('open')

    const wrongMessage = {
      _tag: 'WrongMessage',
    }

    player.send(JSON.stringify(wrongMessage))
    await player.waitForMessageSchema(unparsablePlayerErrorMessageSchema)

    player.close()
  })
})

function testPartyIsNew(party: Party) {
  expect(party.folds.length).toBe(0)
  expect(party.indexCurrentPlayer).toBe(0)
  expect(party.nullBidInARow).toBe(0)
  expect(party.status).toBe('start')
}
