import { Effect, pipe } from 'effect'
import express from 'express'
import { Server as HTTPServer } from 'http'
import { PlayerUUID } from 'shared/src/messages/datas/player'
import { PlayerConnectedMessage } from 'shared/src/messages/server/serverMessages'
import { v4 as uuidv4 } from 'uuid'
import { WebSocket, WebSocketServer } from 'ws'
import {
  addConnectedPlayer,
  deletePlayerFromState,
  getStatePlayer,
  PlayerState,
} from './core/database/players'
import { processPlayerMessage } from './core/player'

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
      hand: [],
    },
  }
  webSocketClientConnection.send(JSON.stringify(playerConnectedMessage))

  webSocketClientConnection.on('message', (message) => {
    Effect.runPromiseExit(
      pipe(
        Effect.Do,
        Effect.bind('refreshedPlayerState', () =>
          Effect.promise(() =>
            getStatePlayer(connectedPlayerState.uuid, false),
          ),
        ),
        Effect.andThen(({ refreshedPlayerState }) =>
          processPlayerMessage(message, refreshedPlayerState),
        ),
        Effect.andThen((serverResponse) =>
          serverResponse.map(({ playerState, data }) =>
            playerState.row.connection.send(JSON.stringify(data)),
          ),
        ),
        Effect.mapError((errorResponse) => {
          console.error(errorResponse.message)
          connectedPlayerState.row.connection.send(
            JSON.stringify(errorResponse),
          )
        }),
      ),
    )
  })

  webSocketClientConnection.on('close', () => {
    handleClientDisconnection(connectedPlayerState) // TODO: replace a player in case it was playing
  })
}
