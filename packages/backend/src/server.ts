import { RawData, WebSocket, WebSocketServer } from "ws";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { User, Users, UserUUID } from "../types/user";
import { messageValidator } from "../../shared/src/zod/webSocketMessage";

const app = express();
const webSocketServer = new WebSocketServer({ noServer: true });

const users: Users = [];

function processReceivedWebSocketMessage(
  webSocketClientConnection: WebSocket,
  message: RawData,
  user: User
) {
  const data = message.toString();
  console.log("Received message:", data);

  // Broadcast the message to all connected clients
  webSocketServer.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      if (client !== webSocketClientConnection) client.send(data);
    }
  });
}

function handleClientDisconnection(userId: string) {
  console.log(`Client with userId=${userId} disconnected`);
}

function handleWebSocketConnection(webSocketClientConnection: WebSocket) {
  const user: User = { uuid: uuidv4() as UserUUID, name: "John" };
  console.log(`${user.uuid} connected`);

  webSocketClientConnection.on("message", (message) => {
    // TODO: switch / case on Event (Connect, PlayCard, PlayLastCard) using zod
    processReceivedWebSocketMessage(webSocketClientConnection, message, user);
    // TODO: return Game
  });

  webSocketClientConnection.on("close", () => {
    handleClientDisconnection(user.uuid);
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
