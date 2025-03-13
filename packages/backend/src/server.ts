import { Schema as S } from '@effect/schema'
import { Effect, Match, Option, pipe } from 'effect'
import express from 'express'
import { Server as HTTPServer } from 'http'
import { Player, PlayerUUID } from 'shared/src/eventSchemas/datas/players'
import {
  PlayerEvent,
  playerEventSchema,
} from 'shared/src/eventSchemas/player/playerEvents'
import {
  PlayerConnectedEvent,
  ServerEvent,
  UnparsableErrorEvent,
} from 'shared/src/eventSchemas/server/serverEvents'
import { v4 as uuidv4 } from 'uuid'
import { RawData, WebSocket, WebSocketServer } from 'ws'
import { searchGame } from './core/game'
import {
  addConnectedPlayer,
  deletePlayerFromState,
  retrieveStatePlayers,
} from './core/state'

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
  return Match.type<PlayerEvent>().pipe(
    Match.tag('PingEvent', () =>
      Effect.succeed({
        _tag: 'PongEvent' as const,
      }),
    ),
    Match.tag('PlayGameEvent', () =>
      pipe(
        searchGame(connectedUser),
        Effect.map((maybeGame) =>
          Option.match(maybeGame, {
            onSome: (game) => {
              return {
                _tag: 'GameStartedEvent' as const,
                data: game,
              }
            },
            onNone: () => {
              return {
                _tag: 'WaitingForGameEvent' as const,
              }
            },
          }),
        ),
      ),
    ),
    Match.exhaustive,
  )(playerEvent)
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
        _tag: 'UnparsableErrorEvent' as const,
        message: `Unable to parse message from player`,
      }
    }),
  )
}

function handleClientDisconnection(player: Player) {
  Effect.runPromiseExit(Effect.promise(() => deletePlayerFromState(player)))
}

async function handleWebSocketConnection(webSocketClientConnection: WebSocket) {
  const connectedPlayer: Player = { uuid: uuidv4() as PlayerUUID }
  console.log(`Client with userId=${connectedPlayer.uuid} connected`)
  await addConnectedPlayer(connectedPlayer, webSocketClientConnection)
  const playerConnectedEvent: PlayerConnectedEvent = {
    _tag: 'PlayerConnectedEvent',
    data: connectedPlayer,
  }
  await addConnectedPlayer(connectedPlayer, webSocketClientConnection)
  webSocketClientConnection.send(JSON.stringify(playerConnectedEvent))

  webSocketClientConnection.on('message', (message) => {
    Effect.runPromiseExit(
      pipe(
        processReceivedWebSocketMessage(message, connectedPlayer),
        Effect.andThen((response) =>
          Match.type<ServerEvent>().pipe(
            Match.tag('PongEvent', 'WaitingForGameEvent', () =>
              Effect.succeed(
                webSocketClientConnection.send(JSON.stringify(response)),
              ),
            ),
            Match.tag('GameStartedEvent', (event) =>
              pipe(
                Effect.succeed(
                  event.data.playerOrder.map((player) => player.uuid),
                ),
                Effect.andThen((playerUUIDs) =>
                  retrieveStatePlayers(playerUUIDs),
                ),
                Effect.andThen((statePlayers) =>
                  Effect.forEach(statePlayers, (statePlayer) =>
                    Effect.succeed(
                      statePlayer?.socket.send(JSON.stringify(response)), // TODO: treat case where user is no longer in state
                    ),
                  ),
                ),
              ),
            ),
            Match.exhaustive,
          )(response),
        ),
        Effect.mapError((errorResponse) => {
          console.error(errorResponse.message)
          webSocketClientConnection.send(JSON.stringify(errorResponse))
        }),
      ),
    )
  })

  webSocketClientConnection.on('close', () => {
    handleClientDisconnection(connectedPlayer) // TODO: replace a player in case it was playing
  })
}
