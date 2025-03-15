import { Schema as S } from '@effect/schema'
import { Effect, Match, Option, pipe } from 'effect'
import express from 'express'
import { Server as HTTPServer } from 'http'
import { PlayerUUID } from 'shared/src/messages/datas/player'
import { TeamPlayer } from 'shared/src/messages/datas/team'
import {
  PlayerMessage,
  playerMessageSchema,
} from 'shared/src/messages/player/playerMessages'
import {
  GameStartedMessage,
  PlayerConnectedMessage,
  UnparsablePlayerErrorMessage,
} from 'shared/src/messages/server/serverMessages'
import { v4 as uuidv4 } from 'uuid'
import { RawData, WebSocket, WebSocketServer } from 'ws'
import { getPlayers } from './core/database/parties'
import {
  addConnectedPlayer,
  deletePlayerFromState,
  getStatePlayer,
  PlayerState,
} from './core/database/players'
import { InitializedGame, ServerResponse } from './core/events'
import { searchForNewGame } from './core/game'

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

function constructGameStartedMessageFromInitializedGame(
  initializedGame: InitializedGame,
): Effect.Effect<GameStartedMessage> {
  return Effect.succeed({
    _tag: 'GameStartedMessage' as const,
    data: {
      game: {
        uuid: initializedGame.game.uuid,
        status: initializedGame.game.row.status,
        teamA: {
          uuid: initializedGame.teamA.uuid,
          name: initializedGame.teamA.row.name,
          player1: {
            uuid: initializedGame.teamA.row.player1_UUID,
          },
          player2: {
            uuid: initializedGame.teamA.row.player2_UUID,
          },
          score: initializedGame.teamA.row.score,
        },
        teamB: {
          uuid: initializedGame.teamB.uuid,
          name: initializedGame.teamB.row.name,
          player1: {
            uuid: initializedGame.teamB.row.player1_UUID,
          } as TeamPlayer,
          player2: {
            uuid: initializedGame.teamB.row.player2_UUID,
          } as TeamPlayer,
          score: initializedGame.teamB.row.score,
        },
        currentParty: {
          uuid: initializedGame.party.uuid,
          status: initializedGame.party.row.status,
          asset: initializedGame.party.row.asset,
          indexCurrentPlayer: initializedGame.party.row.indexCurrentPlayer,
          folds: initializedGame.party.row.folds,
        },
      },
    },
  })
}

function gameStartedResponsesFromInitializedGame(
  initializedGame: InitializedGame,
): Effect.Effect<{ playerState: PlayerState; data: GameStartedMessage }[]> {
  return pipe(
    Effect.succeed(
      getPlayers(initializedGame.teamA.row, initializedGame.teamB.row),
    ),
    Effect.andThen((playersUUID) =>
      Effect.forEach(playersUUID, (playerUUID) =>
        pipe(
          Effect.promise(() => getStatePlayer(playerUUID)),
          Effect.andThen((playerState) =>
            pipe(
              constructGameStartedMessageFromInitializedGame(initializedGame),
              Effect.andThen((gameStartedMessage) =>
                Effect.succeed({
                  playerState,
                  data: gameStartedMessage,
                }),
              ),
            ),
          ),
        ),
      ),
    ),
  )
}

function treatPlayerMessage(
  connectedPlayerState: PlayerState,
  playerEvent: PlayerMessage,
): Effect.Effect<ServerResponse> {
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
    S.decodeUnknownEither(playerMessageSchema)(JSON.parse(message.toString())),
    Effect.mapError(() => {
      return {
        _tag: 'UnparsablePlayerErrorMessage' as const,
        message: `Unable to parse message from player`,
      }
    }),
  )
}

function processPlayerMessage(
  message: RawData,
  connectedPlayerState: PlayerState,
): Effect.Effect<ServerResponse, UnparsablePlayerErrorMessage> {
  return pipe(
    parsePlayerMessage(message),
    Effect.andThen((parsedMessage) =>
      treatPlayerMessage(connectedPlayerState, parsedMessage),
    ),
  )
}

function handleClientDisconnection(player: PlayerState) {
  Effect.runPromiseExit(
    Effect.promise(() => deletePlayerFromState(player.uuid)),
  )
}

async function handleWebSocketConnection(webSocketClientConnection: WebSocket) {
  const connectedPlayerState = await addConnectedPlayer(
    uuidv4() as PlayerUUID,
    webSocketClientConnection,
  )
  console.log(`Client with userId=${connectedPlayerState.uuid} connected`)
  const playerConnectedMessage: PlayerConnectedMessage = {
    _tag: 'PlayerConnectedMessage',
    data: {
      uuid: connectedPlayerState.uuid,
      status: connectedPlayerState.row.status,
    },
  }
  webSocketClientConnection.send(JSON.stringify(playerConnectedMessage))

  webSocketClientConnection.on('message', (message) => {
    Effect.runPromiseExit(
      pipe(
        processPlayerMessage(message, connectedPlayerState),
        Effect.andThen((serverResponse) =>
          serverResponse.map(({ playerState, data }) =>
            playerState.row.connection.send(JSON.stringify(data)),
          ),
        ),
        Effect.mapError((errorResponse) => {
          console.error(errorResponse.message)
          webSocketClientConnection.send(JSON.stringify(errorResponse))
        }),
      ),
    )
  })

  webSocketClientConnection.on('close', () => {
    handleClientDisconnection(connectedPlayerState) // TODO: replace a player in case it was playing
  })
}
