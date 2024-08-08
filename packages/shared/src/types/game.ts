import { Schema as S } from "@effect/schema";
import { fourPlayers, teamSchema } from "./players";

export const gameSchema = S.Struct({
  teams: S.Array(teamSchema).pipe(S.itemsCount(2)),
  playerOrder: fourPlayers,
});

export type Game = typeof gameSchema.Type;
