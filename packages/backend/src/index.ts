import express from 'express';
import { WebSocketServer } from "ws";
import { User } from 'shared/src/types';

const app = express();
const wss = new WebSocketServer({ port: 8080 });

// WebSocket event handling
wss.on('connection', (ws) => {
  console.log('A new client connected.');

  // Event listener for incoming messages
  ws.on('message', (message) => {
    console.log('Received message:', message.toString());

    // Broadcast the message to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message.toString());
      }
    });
  });

  // Event listener for client disconnection
  ws.on('close', () => {
    console.log('A client disconnected.');
  });
});
