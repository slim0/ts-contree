import { Schema } from '@effect/schema'
import { Effect, Match, pipe } from 'effect'
import {
  PlayerMessage,
  playerMessageSchema,
} from 'shared/src/messages/player/playerMessages'
import {
  EndOfPartyMessage,
  GameStartedMessage,
  NewBidMessage,
  NotImplementedErrorMessage,
  NotYourTurnErrorMessage,
  PermissionErrorMessage,
  PlayerStatusErrorMessage,
  PongMessage,
  StateNotFoundErrorMessage,
  UnparsablePlayerErrorMessage,
  WaitingForGameMessage,
} from 'shared/src/messages/server/serverMessages'
import { RawData } from 'ws'
import { treatBidMessage as onBidMessage } from '../controllers.ts/onBidMessage'
import { onPlayGameMessage } from '../controllers.ts/playGameMessage'
import { PlayerState } from './database/players'
import { ServerResponse } from './types'

function treatPlayerMessage(
  connectedPlayerState: PlayerState,
  playerEvent: PlayerMessage,
): Effect.Effect<
  Array<
    ServerResponse<
      | PongMessage
      | WaitingForGameMessage
      | GameStartedMessage
      | NewBidMessage
      | EndOfPartyMessage
    >
  >,
  | PlayerStatusErrorMessage
  | NotImplementedErrorMessage
  | PermissionErrorMessage
  | StateNotFoundErrorMessage
  | NotYourTurnErrorMessage
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
        onPlayGameMessage(connectedPlayerState),
      ),
      Match.tag('BidMessage', (bidMessage) =>
        onBidMessage(bidMessage, connectedPlayerState),
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
  Array<
    ServerResponse<
      | PongMessage
      | WaitingForGameMessage
      | GameStartedMessage
      | NewBidMessage
      | EndOfPartyMessage
    >
  >,
  | UnparsablePlayerErrorMessage
  | PlayerStatusErrorMessage
  | NotImplementedErrorMessage
  | PermissionErrorMessage
  | StateNotFoundErrorMessage
  | NotYourTurnErrorMessage
> {
  return pipe(
    parsePlayerMessage(message),
    Effect.andThen((parsedMessage) =>
      treatPlayerMessage(connectedPlayerState, parsedMessage),
    ),
  )
}
