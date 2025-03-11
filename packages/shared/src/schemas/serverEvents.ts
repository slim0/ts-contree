import { Schema } from "@effect/schema";
import { gameSchema } from "../types/game";
import { playerSchema } from "../types/players";

// Success

export const pongEventSchema = Schema.Struct({
  event: Schema.Literal("pong"),
});

export const playerConnectedEventSchema = Schema.Struct({
  event: Schema.Literal("playerConnected"),
  data: playerSchema,
});

export const waitingForGameEventSchema = Schema.Struct({
  event: Schema.Literal("waitingForGame"),
});

export const gameStartedEventSchema = Schema.Struct({
  event: Schema.Literal("gameStarted"),
  data: gameSchema,
});

export const serverEventSchema = Schema.Union(
  pongEventSchema,
  waitingForGameEventSchema,
  gameStartedEventSchema,
);

export type PongEvent = typeof pongEventSchema.Type;
export type PlayerConnectedEvent = typeof playerConnectedEventSchema.Type;
export type WaitingForGameEvent = typeof waitingForGameEventSchema.Type;
export type GameStartedEvent = typeof gameStartedEventSchema.Type;
export type ServerEvent = typeof serverEventSchema.Type;

// Error

export const unparsableErrorEventSchema = Schema.Struct({
  event: Schema.Literal("unparsableError"),
  message: Schema.String,
});

export type UnparsableErrorEvent = typeof unparsableErrorEventSchema.Type;

export const serverErrorEventSchema = Schema.Union(unparsableErrorEventSchema);

export type ServerErrorEvent = typeof serverErrorEventSchema.Type;
