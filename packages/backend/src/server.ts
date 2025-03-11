import { Schema as S } from '@effect/schema'
import { Effect, Match, Option, pipe } from 'effect'
import express from 'express'
import { Server as HTTPServer } from 'http'
import { PlayerEvent, playerEventSchema } from 'shared/src/schemas/playerEvents'
import {
  PlayerConnectedEvent,
  ServerEvent,
  UnparsableErrorEvent,
} from 'shared/src/schemas/serverEvents'
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

function treatPlayerEvent(
  connectedUser: Player,
  playerEvent: PlayerEvent,
): Effect.Effect<ServerEvent> {
  return Match.value(playerEvent.event).pipe(
    Match.when('ping', () => {
      return Effect.succeed({ event: 'pong' as const })
    }),
    Match.when('playGame', () => {
      return pipe(
        searchGameForPlayer(connectedUser),
        Effect.map((maybeGame) =>
          Option.match(maybeGame, {
            onSome: (game) => {
              return {
                event: 'gameStarted' as const,
                data: game,
              }
            },
            onNone: () => {
              return {
                event: 'waitingForGame' as const,
              }
            },
          }),
        ),
      )
    }),
    Match.exhaustive,
  )
}

function processReceivedWebSocketMessage(
  message: RawData,
  connectedUser: Player,
): Effect.Effect<ServerEvent, UnparsableErrorEvent> {
  return pipe(
    S.decodeUnknownEither(playerEventSchema)(JSON.parse(message.toString())),
    Effect.andThen((parsedMessage) =>
      treatPlayerEvent(connectedUser, parsedMessage),
    ),
    Effect.mapError(() => {
      return {
        event: 'unparsableError' as const,
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
  const playerConnectedEvent: PlayerConnectedEvent = {
    event: 'playerConnected' as const,
    data: connectedUser,
  }
  webSocketClientConnection.send(JSON.stringify(playerConnectedEvent))

  webSocketClientConnection.on('message', (message) => {
    Effect.runPromiseExit(
      pipe(
        processReceivedWebSocketMessage(message, connectedUser),
        Effect.mapBoth({
          onSuccess: (response) =>
            Match.value(response.event).pipe(
              Match.whenOr('pong', 'waitingForGame', () =>
                webSocketClientConnection.send(JSON.stringify(response)),
              ),
              Match.when('gameStarted', () =>
                webSocketClientConnection.send(JSON.stringify(response)),
              ),
              Match.exhaustive,
            ),
          // ,
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
