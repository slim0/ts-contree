import { Schema } from '@effect/schema'
import { Effect, Match, Option, pipe } from 'effect'
import {
  PlayerMessage,
  playerMessageSchema,
} from 'shared/src/messages/player/playerMessages'
import {
  GameStartedMessage,
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

function treatPlayerMessage(
  connectedPlayerState: PlayerState,
  playerEvent: PlayerMessage,
): Effect.Effect<
  | Array<ServerResponse<PongMessage>>
  | Array<ServerResponse<WaitingForGameMessage>>
  | Array<ServerResponse<GameStartedMessage>>
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
          searchForNewGame(connectedPlayerState),
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
  UnparsablePlayerErrorMessage
> {
  return pipe(
    parsePlayerMessage(message),
    Effect.andThen((parsedMessage) =>
      treatPlayerMessage(connectedPlayerState, parsedMessage),
    ),
  )
}
