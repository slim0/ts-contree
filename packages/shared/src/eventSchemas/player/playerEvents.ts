import { Schema } from "@effect/schema";

const pingEventSchema = Schema.Struct({
  event: Schema.Literal("ping"),
});

const playGameEventSchema = Schema.Struct({
  event: Schema.Literal("playGame"),
});

export const playerEventSchema = Schema.Union(
  pingEventSchema,
  playGameEventSchema,
);

export type PingEvent = typeof pingEventSchema.Type;
export type PlayGameEvent = typeof playGameEventSchema.Type;
export type PlayerEvent = typeof playerEventSchema.Type;
