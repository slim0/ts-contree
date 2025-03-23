import { Effect, pipe } from 'effect'
import { Card } from 'shared/src/messages/datas/cards'
import { PlayerStatus } from 'shared/src/messages/datas/player'
import {
  PendingGameMessage,
  PlayerStatusErrorMessage,
} from 'shared/src/messages/server/serverMessages'
import { GameState } from '../core/database/games'
import { PartyState } from '../core/database/parties'
import { PlayerState } from '../core/database/players'
import { TeamState } from '../core/database/teams'
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

export function constructPendingGameMessages(
  game: GameState,
  teamA: TeamState,
  teamB: TeamState,
  party: PartyState,
  players: PlayerState[],
  distributedCards: Card[][],
): Effect.Effect<Array<ServerResponse<PendingGameMessage>>> {
  return pipe(
    Effect.forEach(players, (playerState, index) =>
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
  )
}
