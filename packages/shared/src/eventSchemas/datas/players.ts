import { Schema as S } from "@effect/schema";

const playerUUIDSchema = S.UUID.pipe(S.brand("PlayerUUID"));
export type PlayerUUID = typeof playerUUIDSchema.Type;

export const playerSchema = S.Struct({
  uuid: playerUUIDSchema,
});

export type Player = typeof playerSchema.Type;

export const teamSchema = S.Struct({
  name: S.String,
  players: S.Array(playerSchema).pipe(S.itemsCount(2)),
  score: S.NonNegative,
});

export type Team = typeof teamSchema.Type;
