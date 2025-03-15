import { Schema } from "@effect/schema";

const pingMessageSchema = Schema.Struct({
  _tag: Schema.tag("PingMessage"),
});

const playGameMessageSchema = Schema.Struct({
  _tag: Schema.tag("PlayGameMessage"),
});

export const playerMessageSchema = Schema.Union(
  pingMessageSchema,
  playGameMessageSchema,
);

export type PingMessage = typeof pingMessageSchema.Type;
export type PlayGameMessage = typeof playGameMessageSchema.Type;
export type PlayerMessage = typeof playerMessageSchema.Type;
