import { Schema } from "@effect/schema";
import { gameResponseSchema } from "../datas/game";
import { playerSchema } from "../datas/players";

// Success

export const pongEventSchema = Schema.Struct({
  _tag: Schema.tag("PongEvent"),
});

export const playerConnectedEventSchema = Schema.Struct({
  _tag: Schema.tag("PlayerConnectedEvent"),
  data: playerSchema,
});

export const waitingForGameEventSchema = Schema.Struct({
  _tag: Schema.tag("WaitingForGameEvent"),
});

export const gameStartedEventSchema = Schema.Struct({
  _tag: Schema.tag("GameStartedEvent"),
  data: gameResponseSchema,
});

export const gameStartedEventsSchema = Schema.Struct({
  _tag: Schema.tag("GameStartedEvents"),
  data: Schema.Array(gameStartedEventSchema),
});

const serverReponseEventsSchema = Schema.Union(
  pongEventSchema,
  waitingForGameEventSchema,
  gameStartedEventsSchema,
);

export type PongEvent = typeof pongEventSchema.Type;
export type PlayerConnectedEvent = typeof playerConnectedEventSchema.Type;
export type WaitingForGameEvent = typeof waitingForGameEventSchema.Type;
export type GameStartedEvents = typeof gameStartedEventsSchema.Type;
export type ServerEventsReponses = typeof serverReponseEventsSchema.Type;

// Error

export const unparsableErrorEventSchema = Schema.Struct({
  _tag: Schema.tag("UnparsableErrorEvent"),
  message: Schema.String,
});

export type UnparsableErrorEvent = typeof unparsableErrorEventSchema.Type;

export const serverErrorEventSchema = Schema.Union(unparsableErrorEventSchema);

export type ServerErrorEvent = typeof serverErrorEventSchema.Type;
