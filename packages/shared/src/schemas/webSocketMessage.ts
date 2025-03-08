import { Schema as S } from "@effect/schema";
import { gameSchema } from "../types/game";
import { playerSchema } from "../types/players";

// Client
export const eventSchema = S.Literal(
  "ping",
  "playGame",
  "playCard",
  "playLastCard",
);

export const messageSchema = S.Struct({
  event: eventSchema,
});

export type UserMessage = typeof messageSchema.Type;

// Server
export const serverEventSchema = S.Literal(
  "pong",
  "playerConnected",
  "waitingForGame",
  "gameStarted",
  "cardPlayed",
  "lastCardPlayed",
);

export const serverMessageSchema = S.Struct({
  event: serverEventSchema,
  data: S.optional(S.Union(gameSchema, playerSchema)),
});

export type ServerMessage = typeof serverMessageSchema.Type;
