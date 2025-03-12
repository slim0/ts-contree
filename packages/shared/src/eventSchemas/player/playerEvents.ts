import { Schema } from "@effect/schema";

const pingEventSchema = Schema.Struct({
  _tag: Schema.tag("PingEvent"),
});

const playGameEventSchema = Schema.Struct({
  _tag: Schema.tag("PlayGameEvent"),
});

export const playerEventSchema = Schema.Union(
  pingEventSchema,
  playGameEventSchema,
);

export type PingEvent = typeof pingEventSchema.Type;
export type PlayGameEvent = typeof playGameEventSchema.Type;
export type PlayerEvent = typeof playerEventSchema.Type;
