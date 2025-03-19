import { Schema } from "@effect/schema";

export const playerUUIDSchema = Schema.UUID.pipe(Schema.brand("PlayerUUID"));
export type PlayerUUID = typeof playerUUIDSchema.Type;

export const playerNameSchema = Schema.UUID.pipe(Schema.brand("PlayerName"));
export type PlayerName = typeof playerNameSchema.Type;

export const playerStatusSchema = Schema.Literal(
  "connected",
  "waitingForGame",
  "playing",
);
export type PlayerStatus = typeof playerStatusSchema.Type;

export const playerSchema = Schema.Struct({
  uuid: playerUUIDSchema,
  status: playerStatusSchema,
});

export type Player = typeof playerSchema.Type;
