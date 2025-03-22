import { Effect, pipe } from 'effect'
import { PlayerStatus } from 'shared/src/messages/datas/player'
import { PlayerStatusErrorMessage } from 'shared/src/messages/server/serverMessages'
import { PlayerState } from '../core/database/players'

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
