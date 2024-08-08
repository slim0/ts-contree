import { Schema as S } from "@effect/schema";

const playerUUIDSchema = S.UUID.pipe(S.brand("PlayerUUID"));
export type PlayerUUID = typeof playerUUIDSchema.Type;

const playerSchema = S.Struct({
  uuid: playerUUIDSchema,
});

export type Player = typeof playerSchema.Type;

export const fourPlayers = S.Array(playerSchema).pipe(S.itemsCount(4));
export type FourPlayers = typeof fourPlayers.Type;

const twoPlayers = S.Array(playerSchema).pipe(S.itemsCount(2));
export type TwoPLayers = typeof twoPlayers.Type;

export const teamSchema = S.Struct({
  name: S.String,
  players: twoPlayers,
  score: S.NonNegative,
});

export type Team = typeof teamSchema.Type;
