import { Effect, Option, pipe } from 'effect'
import {
  GameStartedMessage,
  PlayerStatusErrorMessage,
  WaitingForGameMessage,
} from 'shared/src/messages/server/serverMessages'
import { PlayerState } from '../core/database/players'
import { gameStartedResponses, searchForNewGame } from '../core/game'
import { ServerResponse } from '../core/types'
import { verifyPlayerStatus } from './common'

export function onPlayGameMessage(
  connectedPlayerState: PlayerState,
): Effect.Effect<
  Array<ServerResponse<WaitingForGameMessage | GameStartedMessage>>,
  PlayerStatusErrorMessage
> {
  return pipe(
    verifyPlayerStatus(connectedPlayerState, ['connected']),
    Effect.andThen(() => searchForNewGame(connectedPlayerState)),
    Effect.andThen((maybeInitializedGameStates) =>
      Option.match(maybeInitializedGameStates, {
        onSome: (initializedGameStates) =>
          gameStartedResponses(initializedGameStates),
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
