import { Schema } from '@effect/schema'
import { Effect, Match, Option, pipe } from 'effect'
import { PlayerStatus } from 'shared/src/messages/datas/player'
import {
  PlayerMessage,
  playerMessageSchema,
} from 'shared/src/messages/player/playerMessages'
import {
  GameStartedMessage,
  NotManagedErrorMessage,
  PlayerStatusErrorMessage,
  PongMessage,
  UnparsablePlayerErrorMessage,
  WaitingForGameMessage,
} from 'shared/src/messages/server/serverMessages'
import { RawData } from 'ws'
import { PlayerState } from './database/players'
import {
  gameStartedResponsesFromInitializedGame,
  searchForNewGame,
} from './game'
import { ServerResponse } from './types'

function verifyPlayerStatus(
  playerState: PlayerState,
  validPlayerStatuses: PlayerStatus[],
): Effect.Effect<void, PlayerStatusErrorMessage> {
  return Match.value(playerState.row.status).pipe(
    Match.whenOr(...validPlayerStatuses, () => Effect.void),
    Match.orElse((status) =>
      Effect.fail({
        _tag: 'PlayerAlreadyPlayingErrorMessage' as const,
        message: `Player with uuid=${playerState.uuid} has status '${status}', which is not in ${validPlayerStatuses}`,
      }),
    ),
  )
}

function treatPlayerMessage(
  connectedPlayerState: PlayerState,
  playerEvent: PlayerMessage,
): Effect.Effect<
  | Array<ServerResponse<PongMessage>>
  | Array<ServerResponse<WaitingForGameMessage>>
  | Array<ServerResponse<GameStartedMessage>>,
  PlayerStatusErrorMessage | NotManagedErrorMessage
> {
  return pipe(
    Match.type<PlayerMessage>().pipe(
      Match.tag('PingMessage', () =>
        Effect.succeed([
          {
            playerState: connectedPlayerState,
            data: {
              _tag: 'PongMessage' as const,
            },
          },
        ]),
      ),
      Match.tag('PlayGameMessage', () =>
        pipe(
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
        ),
      ),
      Match.tag('BidMessage', (bidMessage) =>
        pipe(
          Effect.andThen(() =>
            Effect.if(bidMessage.data === null, {
              onTrue: () =>
                Effect.fail({
                  _tag: 'NotManagedErrorMessage' as const,
                  message: 'NotManagedErrorMessage',
                }),
              onFalse: () =>
                Effect.fail({
                  _tag: 'NotManagedErrorMessage' as const,
                  message: 'NotManagedErrorMessage',
                }),
            }),
          ),
        ),
      ),
      Match.exhaustive,
    )(playerEvent),
  )
}

function parsePlayerMessage(
  message: RawData,
): Effect.Effect<PlayerMessage, UnparsablePlayerErrorMessage> {
  return pipe(
    Schema.decodeUnknownEither(playerMessageSchema)(
      JSON.parse(message.toString()),
    ),
    Effect.mapError(() => {
      return {
        _tag: 'UnparsablePlayerErrorMessage' as const,
        message: `Unable to parse message from player`,
      }
    }),
  )
}

export function processPlayerMessage(
  message: RawData,
  connectedPlayerState: PlayerState,
): Effect.Effect<
  | Array<ServerResponse<PongMessage>>
  | Array<ServerResponse<WaitingForGameMessage>>
  | Array<ServerResponse<GameStartedMessage>>,
  | UnparsablePlayerErrorMessage
  | PlayerStatusErrorMessage
  | NotManagedErrorMessage
> {
  return pipe(
    parsePlayerMessage(message),
    Effect.andThen((parsedMessage) =>
      treatPlayerMessage(connectedPlayerState, parsedMessage),
    ),
  )
}
