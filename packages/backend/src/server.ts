import { Schema as S } from '@effect/schema'
import { Effect, Match, Option, pipe } from 'effect'
import express from 'express'
import { Server as HTTPServer } from 'http'
import { Game } from 'shared/src/messages/datas/game'
import { Party } from 'shared/src/messages/datas/party'
import { PlayerUUID } from 'shared/src/messages/datas/player'
import { Team, TeamPlayer } from 'shared/src/messages/datas/team'
import {
  PlayerMessage,
  playerMessageSchema,
} from 'shared/src/messages/player/playerMessages'
import {
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
import { ServerEvent, ServerResponse } from './core/events'
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

function treatPlayerMessage(
  connectedPlayerState: PlayerState,
  playerEvent: PlayerMessage,
): Effect.Effect<ServerEvent> {
  return Match.type<PlayerMessage>().pipe(
    Match.tag('PingMessage', () =>
      Effect.succeed({
        _tag: 'PongEvent' as const,
      }),
    ),
    Match.tag('PlayGameMessage', () =>
      pipe(
        searchForNewGame(connectedPlayerState),
        Effect.map((maybeGameStartedEventData) =>
          Option.match(maybeGameStartedEventData, {
            onSome: (gameStartedEventData) => ({
              _tag: 'GameStartedEvent' as const,
              data: gameStartedEventData,
            }),
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
    Effect.andThen((response) =>
      Match.type<ServerEvent>().pipe(
        Match.tag('PongEvent', () =>
          Effect.succeed([
            {
              playerState: connectedPlayerState,
              data: {
                _tag: 'PongMessage' as const,
              },
            },
          ]),
        ),
        Match.tag('WaitingForGameEvent', () =>
          Effect.succeed([
            {
              playerState: connectedPlayerState,
              data: {
                _tag: 'WaitingForGameMessage' as const,
              },
            },
          ]),
        ),
        Match.tag('GameStartedEvent', (gameStartedEvent) =>
          pipe(
            Effect.succeed(
              getPlayers(
                gameStartedEvent.data.teamA.row,
                gameStartedEvent.data.teamB.row,
              ),
            ),
            Effect.andThen((playersUUID) =>
              Effect.forEach(playersUUID, (playerUUID) =>
                pipe(
                  Effect.promise(() => getStatePlayer(playerUUID)),
                  Effect.andThen((playerState) =>
                    Effect.succeed({
                      playerState,
                      data: {
                        _tag: 'GameStartedMessage' as const,
                        data: {
                          game: {
                            uuid: gameStartedEvent.data.game.uuid,
                            status: gameStartedEvent.data.game.row.status,
                            teamA: {
                              uuid: gameStartedEvent.data.teamA.uuid,
                              name: gameStartedEvent.data.teamA.row.name,
                              player1: {
                                uuid: gameStartedEvent.data.teamA.row
                                  .player1_UUID,
                              } as TeamPlayer,
                              player2: {
                                uuid: gameStartedEvent.data.teamA.row
                                  .player2_UUID,
                              } as TeamPlayer,
                              score: gameStartedEvent.data.teamA.row.score,
                            } as Team,
                            teamB: {
                              uuid: gameStartedEvent.data.teamB.uuid,
                              name: gameStartedEvent.data.teamB.row.name,
                              player1: {
                                uuid: gameStartedEvent.data.teamB.row
                                  .player1_UUID,
                              } as TeamPlayer,
                              player2: {
                                uuid: gameStartedEvent.data.teamB.row
                                  .player2_UUID,
                              } as TeamPlayer,
                              score: gameStartedEvent.data.teamB.row.score,
                            } as Team,
                            currentParty: {
                              uuid: gameStartedEvent.data.party.uuid,
                              status: gameStartedEvent.data.party.row.status,
                              asset: gameStartedEvent.data.party.row.asset,
                              indexCurrentPlayer:
                                gameStartedEvent.data.party.row
                                  .indexCurrentPlayer,
                              folds: gameStartedEvent.data.party.row.folds,
                            } as Party,
                          } as Game,
                        },
                      },
                    }),
                  ),
                ),
              ),
            ),
          ),
        ),
        Match.exhaustive,
      )(response),
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
