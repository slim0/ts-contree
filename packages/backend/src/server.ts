import { RawData, WebSocket, WebSocketServer } from "ws";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { Clients } from "./types";

const app = express();
const webSocketServer = new WebSocketServer({ noServer: true });

const clients: Clients = {};

function processReceivedWebSocketMessage(
  webSocketClientConnection: WebSocket,
  message: RawData,
  userId: string
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
  const userId = uuidv4();
  console.log(`A new client connected. userId=${userId}`);

  webSocketClientConnection.on("message", (message) => {
    processReceivedWebSocketMessage(webSocketClientConnection, message, userId);
  });

  webSocketClientConnection.on("close", () => {
    handleClientDisconnection(userId);
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
