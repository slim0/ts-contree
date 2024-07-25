import { WebSocket } from "ws";

type Client = WebSocket;

export type Clients = Record<string, Client>;
