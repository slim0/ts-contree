import { Effect, Match, Option, pipe } from "effect";
import express from "express";
import { ServerMessageError } from "shared/src/errors/webSocketMessage";
import { Game } from "shared/src/types/game";
import { Player, PlayerUUID, Team } from "shared/src/types/players";
import { zodParseEffect, ZodParseError } from "shared/src/utils/effect";
import {
  messageValidator,
  ServerMessage,
  UserMessage,
} from "shared/src/zod/webSocketMessage";
import { v4 as uuidv4 } from "uuid";
import { RawData, WebSocket, WebSocketServer } from "ws";

const app = express();
const webSocketServer = new WebSocketServer({ noServer: true });

const waitingPlayers: Player[] = [];
const games: Game[] = [];

function initGame(players: [Player, Player, Player, Player]): Game {
  const teamA: Team = {
    name: "TeamA",
    players: [players[0], players[2]],
    score: 0,
  };
  const teamB: Team = {
    name: "TeamB",
    players: [players[1], players[3]],
    score: 0,
  };
  return {
    teams: [teamA, teamB],
    playerOrder: players,
  };
}

function searchGameForPlayer(
  player: Player,
  waitingPlayers: Player[]
): Effect.Effect<Option.Option<Game>> {
  return Effect.succeed(
    initGame([
      player,
      waitingPlayers.shift()!,
      waitingPlayers.shift()!,
      waitingPlayers.shift()!,
    ])
  ).pipe(Effect.when(() => waitingPlayers.length >= 3));
}
function treatUserMessage(
  connectedUser: Player,
  userMessage: UserMessage
): Effect.Effect<ServerMessage> {
  return Match.value(userMessage.event).pipe(
    Match.when("connect", () => {
      return pipe(
        searchGameForPlayer(connectedUser, waitingPlayers),
        Effect.map((maybeGame) => {
          return Option.match(maybeGame, {
            onSome: () => {
              return { message: "user connected", data: null };
            },
            onNone: () => {
              return { message: "user connected", data: null };
            },
          });
        })
      );
    }),
    Match.when("playCard", () => {
      return Effect.succeed({ message: "user played card", data: null });
    }),
    Match.when("playLastCard", () => {
      return Effect.succeed({ message: "user played last card", data: null });
    }),
    Match.exhaustive
  );
}

function processReceivedWebSocketMessage(
  message: RawData,
  connectedUser: Player
): Effect.Effect<ServerMessage, ServerMessageError<ZodParseError>> {
  const data = message.toString();
  return pipe(
    zodParseEffect(messageValidator, data),
    Effect.flatMap((parsedMessage) =>
      treatUserMessage(connectedUser, parsedMessage)
    ),
    Effect.mapError((error) => ({
      message: "Failed to process received webSocket message",
      error,
    }))
  );
}

function handleClientDisconnection(userId: string) {
  console.log(`Client with userId=${userId} disconnected`);
}

function handleWebSocketConnection(webSocketClientConnection: WebSocket) {
  const connectedUser: Player = { uuid: uuidv4() as PlayerUUID };
  console.log(`Client with userId=${connectedUser.uuid} connected`);

  webSocketClientConnection.on("message", (message) => {
    Effect.runSync(
      pipe(
        processReceivedWebSocketMessage(message, connectedUser),
        Effect.mapBoth({
          onSuccess: (response) => {
            webSocketClientConnection.send(JSON.stringify(response));
          },
          onFailure: (errorResponse) => {
            console.error(errorResponse);
            webSocketClientConnection.send(JSON.stringify(errorResponse));
          },
        })
      )
    );
  });

  webSocketClientConnection.on("close", () => {
    handleClientDisconnection(connectedUser.uuid);
  });
}

webSocketServer.on("connection", (connection) => {
  handleWebSocketConnection(connection);
});

const WS_PORT = 3000;
const server = app.listen(WS_PORT);
console.log(`WebSocket server running on port ${WS_PORT}`);

server.on("upgrade", (request, socket, head) => {
  webSocketServer.handleUpgrade(request, socket, head, (socket) => {
    webSocketServer.emit("connection", socket, request);
  });
});
