import { WebSocketServer } from "ws";
import express from "express";

const app = express();

const WS_PORT = 8080;
const wss = new WebSocketServer({ port: WS_PORT });

console.log(`WebSocket server running on port ${WS_PORT}`);

// WebSocket event handling
wss.on("connection", (ws) => {
  console.log("A new client connected.");

  // Event listener for incoming messages
  ws.on("message", (message) => {
    console.log("Received message:", message.toString());

    // Broadcast the message to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message.toString());
      }
    });
  });

  // Event listener for client disconnection
  ws.on("close", () => {
    console.log("A client disconnected.");
  });
});
