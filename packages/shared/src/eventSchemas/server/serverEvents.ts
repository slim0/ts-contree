import { Schema } from "@effect/schema";
import { gameSchema } from "../datas/game";
import { playerUUIDSchema } from "../datas/players";

// Success

export const pongEventSchema = Schema.Struct({
  _tag: Schema.tag("PongEvent"),
});

export const playerConnectedEventSchema = Schema.Struct({
  _tag: Schema.tag("PlayerConnectedEvent"),
  data: playerUUIDSchema,
});

export const waitingForGameEventSchema = Schema.Struct({
  _tag: Schema.tag("WaitingForGameEvent"),
});

export const gameStartedEventSchema = Schema.Struct({
  _tag: Schema.tag("GameStartedEvent"),
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
  _tag: Schema.tag("UnparsableErrorEvent"),
  message: Schema.String,
});

export type UnparsableErrorEvent = typeof unparsableErrorEventSchema.Type;

export const serverErrorEventSchema = Schema.Union(unparsableErrorEventSchema);

export type ServerErrorEvent = typeof serverErrorEventSchema.Type;
