import { RawData, WebSocket, WebSocketServer } from "ws";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { User, Users, UserUUID } from "../types/user";
import { zodParseEffect, ZodParseError } from "../../shared/src/utils/effect";
import {
  UserMessage,
  messageValidator,
  ServerMessage,
} from "../../shared/src/zod/webSocketMessage";
import { Effect, Either, pipe } from "effect";
import { exhaustiveCheck } from "./typescript-tools";

const app = express();
const webSocketServer = new WebSocketServer({ noServer: true });

const users: Users = [];

function treatUserMessage(
  connectedUser: User,
  userMessage: UserMessage
): Effect.Effect<ServerMessage> {
  switch (userMessage.event) {
    case "connect":
      return Effect.succeed({ message: "user connected" });
    case "playCard":
      return Effect.succeed({ message: "user played card" });
    case "playLastCard":
      return Effect.succeed({ message: "user played last card" });
    default:
      exhaustiveCheck(userMessage.event);
      throw Error("Unreachable code");
  }
}

function processReceivedWebSocketMessage(
  message: RawData,
  connectedUser: User
): Effect.Effect<ServerMessage, ZodParseError> {
  const data = message.toString();
  return pipe(
    zodParseEffect(messageValidator, data),
    Effect.flatMap((message) => treatUserMessage(connectedUser, message))
  );
}

function handleClientDisconnection(userId: string) {
  console.log(`Client with userId=${userId} disconnected`);
}

function handleWebSocketConnection(webSocketClientConnection: WebSocket) {
  const connectedUser: User = { uuid: uuidv4() as UserUUID };
  console.log(`${connectedUser.uuid} connected`);

  webSocketClientConnection.on("message", (message) => {
    Effect.runSync(
      Effect.gen(function* () {
        const failureOrSuccess = yield* Effect.either(
          processReceivedWebSocketMessage(message, connectedUser)
        );
        if (Either.isRight(failureOrSuccess)) {
          const serverMessage = failureOrSuccess.right;
          webSocketServer.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(serverMessage));
            }
          });
        } else {
          const errorMessage = failureOrSuccess.left;
          switch (errorMessage._tag) {
            case "ZodParseError":
              console.error(errorMessage.zodError);
              return webSocketClientConnection.send(
                JSON.stringify(errorMessage)
              );
            default:
              exhaustiveCheck(errorMessage._tag);
              throw Error("Unreachable code");
          }
        }
      })
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
