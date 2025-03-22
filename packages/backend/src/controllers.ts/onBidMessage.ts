import { Effect, pipe } from 'effect'
import { Bet } from 'shared/src/messages/datas/bid'
import { PartyUUID } from 'shared/src/messages/datas/party'
import { PlayerUUID } from 'shared/src/messages/datas/player'
import { BidMessage } from 'shared/src/messages/player/playerMessages'
import {
  EndOfPartyMessage,
  NewBidMessage,
  NotYourTurnErrorMessage,
  PermissionErrorMessage,
  StateNotFoundErrorMessage,
} from 'shared/src/messages/server/serverMessages'
import { createBid } from '../core/database/bid'
import { GameState, getGameStateEffect } from '../core/database/games'
import {
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

type onBidMessageStates = {
  partyState: PartyState
  gameState: GameState
  teamA_State: TeamState
  teamB_State: TeamState
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
    Effect.andThen(({ partyState, gameState, teamA_State, teamB_State }) => ({
      partyState,
      gameState,
      teamA_State,
      teamB_State,
    })),
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

function buildEndOfPartyMessages(
  teamA_State: TeamState,
  teamB_State: TeamState,
  gameState: GameState,
): Effect.Effect<Array<ServerResponse<EndOfPartyMessage>>> {
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
                  _tag: 'EndOfPartyMessage' as const,
                  data: {
                    game: gameState.row,
                    teamA: teamA_State.row,
                    teamB: teamB_State.row,
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

function buildNewNullBidMessages(
  teamA_State: TeamState,
  teamB_State: TeamState,
  partyState: PartyState,
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
                    partyUUID: partyState.uuid,
                    bet: null,
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
): Effect.Effect<Array<ServerResponse<NewBidMessage | EndOfPartyMessage>>> {
  return pipe(
    Effect.all([
      Effect.promise(() => shiftIndexCurrentPlayer(partyState.uuid)),
      Effect.promise(() => shiftNullBidInARow(partyState.uuid)),
    ]),
    Effect.andThen(([_indexCurrentPlayer, nullBidInARow]) =>
      Effect.if(nullBidInARow === 4, {
        onTrue: () =>
          buildEndOfPartyMessages(teamA_State, teamB_State, gameState),
        onFalse: () =>
          buildNewNullBidMessages(teamA_State, teamB_State, partyState),
      }),
    ),
  )
}

function onPlayerDecidedToBet(
  connectedPlayerState: PlayerState,
  bet: Bet,
  states: onBidMessageStates,
): Effect.Effect<
  Array<ServerResponse<NewBidMessage>>,
  PermissionErrorMessage | NotYourTurnErrorMessage
> {
  return pipe(
    Effect.Do,
    Effect.bind('playerUUIDs', () =>
      getPlayers(states.teamA_State.row, states.teamB_State.row),
    ),
    Effect.tap(() =>
      userBelongsToParty(
        connectedPlayerState.uuid,
        states.teamA_State,
        states.teamB_State,
      ),
    ),
    Effect.tap(() =>
      userIsTheCurrentPlayer(
        connectedPlayerState.uuid,
        states.partyState,
        states.teamA_State,
        states.teamB_State,
      ),
    ),
    Effect.bind('bidState', () =>
      Effect.promise(() =>
        createBid(states.partyState.uuid, bet.asset, bet.betScore),
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
              playerState: playerState,
              data: {
                _tag: 'NewBidMessage' as const,
                data: {
                  partyUUID: states.partyState.uuid,
                  bet: {
                    uuid: bidState.uuid,
                    betScore: bidState.row.betScore,
                    asset: bidState.row.asset,
                  },
                },
              },
            })),
          ),
        ),
      ),
    ),
  )
}

export function treatBidMessage(
  bidMessage: BidMessage,
  connectedPlayerState: PlayerState,
): Effect.Effect<
  Array<ServerResponse<NewBidMessage | EndOfPartyMessage>>,
  StateNotFoundErrorMessage | PermissionErrorMessage | NotYourTurnErrorMessage
> {
  return pipe(
    retrieveStates(bidMessage.data.partyUUID),
    Effect.andThen((states) =>
      Effect.if(bidMessage.data.bet !== null, {
        onTrue: () =>
          onPlayerDecidedToBet(
            connectedPlayerState,
            bidMessage.data.bet!,
            states,
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
