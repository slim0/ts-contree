import { Schema as S } from "@effect/schema";
import { gameSchema } from "../types/game";

// Client
export const eventSchema = S.Literal("connect", "playCard", "playLastCard");

export const messageSchema = S.Struct({
  event: eventSchema,
});

export type UserMessage = typeof messageSchema.Type;

// Server

export const serverMessageSchema = S.Struct({
  message: S.String,
  data: S.NullOr(gameSchema),
});

export type ServerMessage = typeof serverMessageSchema.Type;
