import { Schema as S } from "@effect/schema";
import { playerSchema, teamSchema } from "./players";

export const gameSchema = S.Struct({
  teams: S.Array(teamSchema).pipe(S.itemsCount(2)),
  playerOrder: S.Array(playerSchema).pipe(S.itemsCount(4)),
});

export type Game = typeof gameSchema.Type;
