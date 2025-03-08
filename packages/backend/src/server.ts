import { Schema as S } from '@effect/schema'
import { Effect, Match, Option, pipe } from 'effect'
import express from 'express'
import { Server as HTTPServer } from 'http'
import {
  ServerMessageError,
  UnparsableMessageError,
} from 'shared/src/errors/webSocketMessage'
import {
  messageSchema,
  ServerMessage,
  UserMessage,
} from 'shared/src/schemas/webSocketMessage'
import { Player, PlayerUUID } from 'shared/src/types/players'
import { v4 as uuidv4 } from 'uuid'
import { RawData, WebSocket, WebSocketServer } from 'ws'
import { searchGameForPlayer } from './core/game'
import { deleteWaitingPlayer } from './core/state'

export function createWebSocketServer(server: HTTPServer) {
  const webSocketServer = new WebSocketServer({ server })
  console.log(`WebSocket server running on port ${WS_PORT}`)

  webSocketServer.on('connection', (connection) => {
    handleWebSocketConnection(connection)
  })

  return webSocketServer
}

const app = express()
const WS_PORT = 3000
const httpServer = app.listen(WS_PORT)

createWebSocketServer(httpServer)

function treatUserMessage(
  connectedUser: Player,
  userMessage: UserMessage,
): Effect.Effect<ServerMessage> {
  return Match.value(userMessage.event).pipe(
    Match.when('ping', () => {
      return Effect.succeed({ message: 'pong', data: null })
    }),
    Match.when('playGame', () => {
      return pipe(
        searchGameForPlayer(connectedUser),
        Effect.map((maybeGame) =>
          Option.match(maybeGame, {
            onSome: (game) => {
              return {
                message: 'user connected',
                data: game,
              }
            },
            onNone: () => {
              return { message: 'user connected', data: null }
            },
          }),
        ),
      )
    }),
    Match.when('playCard', () => {
      return Effect.succeed({ message: 'user played card', data: null })
    }),
    Match.when('playLastCard', () => {
      return Effect.succeed({
        message: 'user played last card',
        data: null,
      })
    }),
    Match.exhaustive,
  )
}

function processReceivedWebSocketMessage(
  message: RawData,
  connectedUser: Player,
): Effect.Effect<ServerMessage, ServerMessageError<UnparsableMessageError>> {
  return pipe(
    S.decodeUnknownEither(messageSchema)(JSON.parse(message.toString())),
    Effect.andThen((parsedMessage) =>
      treatUserMessage(connectedUser, parsedMessage),
    ),
    Effect.mapError(() => {
      return {
        _tag: 'UnparsableMessageError',
        message: `Unable to parse message from player`,
      }
    }),
  )
}

function handleClientDisconnection(player: Player) {
  Effect.runPromiseExit(Effect.promise(() => deleteWaitingPlayer(player)))
}

function handleWebSocketConnection(webSocketClientConnection: WebSocket) {
  const connectedUser: Player = { uuid: uuidv4() as PlayerUUID }
  console.log(`Client with userId=${connectedUser.uuid} connected`)

  webSocketClientConnection.on('message', (message) => {
    Effect.runPromiseExit(
      pipe(
        processReceivedWebSocketMessage(message, connectedUser),
        Effect.mapBoth({
          onSuccess: (response) => {
            webSocketClientConnection.send(JSON.stringify(response))
          },
          onFailure: (errorResponse) => {
            console.error(errorResponse.message)
            webSocketClientConnection.send(JSON.stringify(errorResponse))
          },
        }),
      ),
    )
  })

  webSocketClientConnection.on('close', () => {
    handleClientDisconnection(connectedUser)
  })
}
