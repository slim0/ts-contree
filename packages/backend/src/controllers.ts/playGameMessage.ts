import { Effect, Option, pipe } from 'effect'
import { PlayerStatus } from 'shared/src/messages/datas/player'
import {
  GameStartedMessage,
  PlayerStatusErrorMessage,
  WaitingForGameMessage,
} from 'shared/src/messages/server/serverMessages'
import { PlayerState } from '../core/database/players'
import {
  gameStartedResponsesFromInitializedGame,
  searchForNewGame,
} from '../core/game'
import { ServerResponse } from '../core/types'

function verifyPlayerStatus(
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

export function onPlayGameMessage(
  connectedPlayerState: PlayerState,
): Effect.Effect<
  | Array<ServerResponse<WaitingForGameMessage>>
  | Array<ServerResponse<GameStartedMessage>>,
  PlayerStatusErrorMessage
> {
  return pipe(
    verifyPlayerStatus(connectedPlayerState, ['connected']),
    Effect.andThen(() => searchForNewGame(connectedPlayerState)),
    Effect.andThen((maybeInitializedGame) =>
      Option.match(maybeInitializedGame, {
        onSome: (initializedGame) =>
          gameStartedResponsesFromInitializedGame(initializedGame),
        onNone: () =>
          Effect.succeed([
            {
              playerState: connectedPlayerState,
              data: {
                _tag: 'WaitingForGameMessage' as const,
              },
            },
          ]),
      }),
    ),
  )
}
