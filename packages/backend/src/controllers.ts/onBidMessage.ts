import { Effect, pipe } from 'effect'
import { Bet } from 'shared/src/messages/datas/bid'
import { deckOf32Cards } from 'shared/src/messages/datas/cards'
import { PartyUUID } from 'shared/src/messages/datas/party'
import { PlayerUUID } from 'shared/src/messages/datas/player'
import { BidMessage } from 'shared/src/messages/player/playerMessages'
import {
  BidNotValidErrorMessage,
  NewBidMessage,
  NotYourTurnErrorMessage,
  PendingGameMessage,
  PermissionErrorMessage,
  PlayerStatusErrorMessage,
  StateNotFoundErrorMessage,
} from 'shared/src/messages/server/serverMessages'
import { distributeCards } from '../core/cards'
import {
  BidState,
  bidStatesFromPartyUUID,
  createBid,
} from '../core/database/bid'
import { GameState, getGameStateEffect } from '../core/database/games'
import {
  createParty,
  deleteParty,
  getCurrentPlayer,
  getPartyStateEffect,
  getPlayers,
  PartyState,
  resetNullBidInARow,
  shiftIndexCurrentPlayer,
  shiftNullBidInARow,
} from '../core/database/parties'
import { getStatePlayer, PlayerState } from '../core/database/players'
import { getTeamStateEffect, TeamState } from '../core/database/teams'
import { ServerResponse } from '../core/types'
import { constructPendingGameMessages, verifyPlayerStatus } from './common'

type onBidMessageStates = {
  partyState: PartyState
  gameState: GameState
  teamA_State: TeamState
  teamB_State: TeamState
  bidStates: BidState[]
}

function retrieveStates(
  partyUUID: PartyUUID,
): Effect.Effect<onBidMessageStates, StateNotFoundErrorMessage> {
  return pipe(
    Effect.Do,
    Effect.bind('partyState', () => getPartyStateEffect(partyUUID)),
    Effect.bind('gameState', ({ partyState }) =>
      getGameStateEffect(partyState.row.gameUUID),
    ),
    Effect.bind('teamA_State', ({ gameState }) =>
      getTeamStateEffect(gameState.row.teamA_UUID),
    ),
    Effect.bind('teamB_State', ({ gameState }) =>
      getTeamStateEffect(gameState.row.teamB_UUID),
    ),
    Effect.bind('bidStates', () =>
      Effect.succeed(bidStatesFromPartyUUID(partyUUID)),
    ),
    Effect.andThen(
      ({ partyState, gameState, teamA_State, teamB_State, bidStates }) => ({
        partyState,
        gameState,
        teamA_State,
        teamB_State,
        bidStates,
      }),
    ),
  )
}

function userBelongsToParty(
  playerUUID: PlayerUUID,
  teamA_State: TeamState,
  teamB_State: TeamState,
): Effect.Effect<void, PermissionErrorMessage> {
  return pipe(
    getPlayers(teamA_State.row, teamB_State.row),
    Effect.andThen((players) =>
      Effect.if(players.includes(playerUUID), {
        onTrue: () => Effect.void,
        onFalse: () =>
          Effect.fail({
            _tag: 'PermissionErrorMessage' as const,
            message: `User with uuid=${playerUUID} do not belongs the team ${teamA_State.uuid} nor ${teamB_State.uuid}}`,
          }),
      }),
    ),
  )
}

function userIsTheCurrentPlayer(
  playerUUID: PlayerUUID,
  partyState: PartyState,
  teamA_State: TeamState,
  teamB_State: TeamState,
): Effect.Effect<void, NotYourTurnErrorMessage> {
  return pipe(
    getCurrentPlayer(partyState.row, teamA_State.row, teamB_State.row),
    Effect.andThen((currentPlayerUUID) =>
      Effect.if(currentPlayerUUID === playerUUID, {
        onTrue: () => Effect.void,
        onFalse: () =>
          Effect.fail({
            _tag: 'NotYourTurnErrorMessage' as const,
            message: '',
          }),
      }),
    ),
  )
}

function allPlayersDecidedNotToBet(
  teamA_State: TeamState,
  teamB_State: TeamState,
  gameState: GameState,
  partyUUID: PartyUUID,
): Effect.Effect<Array<ServerResponse<PendingGameMessage>>> {
  return pipe(
    Effect.Do,
    Effect.tap(() => Effect.promise(() => deleteParty(partyUUID))),
    Effect.bind('newParty', () =>
      Effect.promise(() => createParty(gameState.uuid)),
    ),
    Effect.bind('playerStates', () =>
      pipe(
        getPlayers(teamA_State.row, teamB_State.row),
        Effect.andThen((playerUUIDs) =>
          Effect.forEach(playerUUIDs, (playerUUID) => {
            return Effect.promise(() => getStatePlayer(playerUUID, false))
          }),
        ),
      ),
    ),
    Effect.andThen(({ playerStates, newParty }) =>
      pipe(
        distributeCards(deckOf32Cards),
        Effect.andThen((distributedCards) =>
          constructPendingGameMessages(
            gameState,
            teamA_State,
            teamB_State,
            newParty,
            playerStates,
            distributedCards,
          ),
        ),
      ),
    ),
  )
}

function buildNewNullBidMessages(
  teamA_State: TeamState,
  teamB_State: TeamState,
): Effect.Effect<Array<ServerResponse<NewBidMessage>>> {
  return pipe(
    getPlayers(teamA_State.row, teamB_State.row),
    Effect.andThen((playerUUIDs) =>
      pipe(
        Effect.forEach(playerUUIDs, (playerUUID) =>
          pipe(
            Effect.promise(() => getStatePlayer(playerUUID)),
            Effect.andThen((playerState) =>
              Effect.succeed({
                playerState: playerState,
                data: {
                  _tag: 'NewBidMessage' as const,
                  data: {
                    bid: null,
                  },
                },
              }),
            ),
          ),
        ),
      ),
    ),
  )
}

function onPlayerDecidedNotToBet(
  partyState: PartyState,
  teamA_State: TeamState,
  teamB_State: TeamState,
  gameState: GameState,
): Effect.Effect<Array<ServerResponse<NewBidMessage | PendingGameMessage>>> {
  return pipe(
    Effect.all([
      Effect.promise(() => shiftIndexCurrentPlayer(partyState.uuid)),
      Effect.promise(() => shiftNullBidInARow(partyState.uuid)),
    ]),
    Effect.andThen(([_indexCurrentPlayer, nullBidInARow]) =>
      Effect.if(nullBidInARow === 4, {
        onTrue: () =>
          allPlayersDecidedNotToBet(
            teamA_State,
            teamB_State,
            gameState,
            partyState.uuid,
          ),
        onFalse: () => buildNewNullBidMessages(teamA_State, teamB_State),
      }),
    ),
  )
}

function onPlayerDecidedToBet(
  playerState: PlayerState,
  bet: Bet,
  states: onBidMessageStates,
): Effect.Effect<Array<ServerResponse<NewBidMessage>>> {
  return pipe(
    Effect.Do,
    Effect.bind('playerUUIDs', () =>
      getPlayers(states.teamA_State.row, states.teamB_State.row),
    ),
    Effect.bind('bidState', () =>
      Effect.promise(() =>
        createBid(
          states.partyState.uuid,
          playerState.uuid,
          bet.asset,
          bet.betScore,
        ),
      ),
    ),
    Effect.tap(() =>
      Effect.all([
        Effect.promise(() => shiftIndexCurrentPlayer(states.partyState.uuid)),
        Effect.promise(() => resetNullBidInARow(states.partyState.uuid)),
      ]),
    ),
    Effect.andThen(({ playerUUIDs, bidState }) =>
      pipe(
        Effect.forEach(playerUUIDs, (playerUUID) =>
          pipe(
            Effect.promise(() => getStatePlayer(playerUUID)),
            Effect.andThen((playerState) => ({
              playerState,
              data: {
                _tag: 'NewBidMessage' as const,
                data: {
                  bid: bidState.row,
                },
              },
            })),
          ),
        ),
      ),
    ),
  )
}

function checkBidIsValid(
  bet: Bet,
  oldBids: BidState[],
): Effect.Effect<void, BidNotValidErrorMessage> {
  return Effect.if(oldBids.length === 0, {
    onTrue: () => Effect.void,
    onFalse: () =>
      pipe(
        Effect.succeed(
          oldBids.sort((a, b) => b.row.bet.betScore - a.row.bet.betScore),
        ),
        Effect.andThen((oldBidsSorted) => oldBidsSorted[0]),
        Effect.andThen((higherBid) =>
          Effect.if(bet.betScore <= higherBid.row.bet.betScore, {
            onTrue: () =>
              Effect.fail({
                _tag: 'BidNotValidErrorMessage' as const,
                message: `Bet not valid because betScore is lower or equal than an existing Bid`,
              }),
            onFalse: () => Effect.void,
          }),
        ),
      ),
  })
}

function checkUserPermission(
  connectedPlayerState: PlayerState,
  states: onBidMessageStates,
): Effect.Effect<
  [void, void],
  PermissionErrorMessage | NotYourTurnErrorMessage
> {
  return Effect.all([
    userBelongsToParty(
      connectedPlayerState.uuid,
      states.teamA_State,
      states.teamB_State,
    ),
    userIsTheCurrentPlayer(
      connectedPlayerState.uuid,
      states.partyState,
      states.teamA_State,
      states.teamB_State,
    ),
  ])
}

export function treatBidMessage(
  bidMessage: BidMessage,
  connectedPlayerState: PlayerState,
): Effect.Effect<
  Array<ServerResponse<NewBidMessage | PendingGameMessage>>,
  | PlayerStatusErrorMessage
  | StateNotFoundErrorMessage
  | PermissionErrorMessage
  | NotYourTurnErrorMessage
  | BidNotValidErrorMessage
> {
  return pipe(
    verifyPlayerStatus(connectedPlayerState, ['playing']),
    Effect.andThen(() => retrieveStates(bidMessage.data.partyUUID)),
    Effect.tap((states) => checkUserPermission(connectedPlayerState, states)),
    Effect.andThen((states) =>
      Effect.if(bidMessage.data.bet !== null, {
        onTrue: () =>
          pipe(
            checkBidIsValid(bidMessage.data.bet!, states.bidStates),
            Effect.andThen(() =>
              onPlayerDecidedToBet(
                connectedPlayerState,
                bidMessage.data.bet!,
                states,
              ),
            ),
          ),
        onFalse: () =>
          onPlayerDecidedNotToBet(
            states.partyState,
            states.teamA_State,
            states.teamB_State,
            states.gameState,
          ),
      }),
    ),
  )
}
