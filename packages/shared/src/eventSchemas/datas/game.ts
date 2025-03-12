import { Schema } from "@effect/schema";
import { playerSchema, teamSchema } from "./players";

const gameUUIDSchema = Schema.UUID.pipe(Schema.brand("GameUUID"));
export type GameUUID = typeof gameUUIDSchema.Type;

export const gameSchema = Schema.Struct({
  teams: Schema.Array(teamSchema).pipe(Schema.itemsCount(2)),
  playerOrder: Schema.Array(playerSchema).pipe(Schema.itemsCount(4)),
});

export type Game = typeof gameSchema.Type;
