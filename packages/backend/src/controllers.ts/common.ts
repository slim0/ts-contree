import { Effect, pipe } from 'effect'
import { Card } from 'shared/src/messages/datas/cards'
import { PartyUUID } from 'shared/src/messages/datas/party'
import { PlayerStatus } from 'shared/src/messages/datas/player'
import {
  PendingGameMessage,
  PlayerStatusErrorMessage,
  StateNotFoundErrorMessage,
} from 'shared/src/messages/server/serverMessages'
import { BidState, bidStatesFromPartyUUID } from '../core/database/bid'
import { GameState, getGameStateEffect } from '../core/database/games'
import { getPartyStateEffect, PartyState } from '../core/database/parties'
import { PlayerState } from '../core/database/players'
import { getTeamStateEffect, TeamState } from '../core/database/teams'
import { ServerResponse } from '../core/types'

export function verifyPlayerStatus(
  playerState: PlayerState,
  validPlayerStatuses: PlayerStatus[],
): Effect.Effect<void, PlayerStatusErrorMessage> {
  return pipe(
    Effect.if(validPlayerStatuses.includes(playerState.row.status), {
      onTrue: () => Effect.void,
      onFalse: () =>
        Effect.fail({
          _tag: 'PlayerStatusErrorMessage' as const,
          message: `Player with uuid=${playerState.uuid} has status '${playerState.row.status}', which is not in ${validPlayerStatuses}`,
        }),
    }),
  )
}

export type States = {
  partyState: PartyState
  gameState: GameState
  teamA_State: TeamState
  teamB_State: TeamState
  bidStates: BidState[]
}

export function retrieveStates(
  partyUUID: PartyUUID,
): Effect.Effect<States, StateNotFoundErrorMessage> {
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
export function constructPendingGameMessages(
  game: GameState,
  teamA: TeamState,
  teamB: TeamState,
  party: PartyState,
  players: PlayerState[],
  distributedCards: Card[][],
): Effect.Effect<Array<ServerResponse<PendingGameMessage>>> {
  return Effect.forEach(players, (playerState, index) =>
      Effect.succeed({
        playerState,
        data: {
          _tag: 'PendingGameMessage' as const,
          data: {
            game: game.row,
            teamA: teamA.row,
            teamB: teamB.row,
            party: party.row,
            hand: distributedCards[index],
          },
        },
      }),
    ),

}
