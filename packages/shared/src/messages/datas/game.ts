import { Schema } from "@effect/schema";
import { teamUUIDSchema } from "./team";

export const gameUUIDSchema = Schema.UUID.pipe(Schema.brand("GameUUID"));
export type GameUUID = typeof gameUUIDSchema.Type;

export const gameStatusSchema = Schema.Literal("playing", "finish");
export type GameStatus = typeof gameStatusSchema.Type;

export const gameSchema = Schema.Struct({
  uuid: gameUUIDSchema,
  teamA_UUID: teamUUIDSchema,
  teamB_UUID: teamUUIDSchema,
  status: gameStatusSchema,
});

export type Game = typeof gameSchema.Type;
