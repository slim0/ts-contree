import { Schema } from "@effect/schema";
import { partySchema } from "./party";
import { teamSchema } from "./team";

export const gameUUIDSchema = Schema.UUID.pipe(Schema.brand("GameUUID"));
export type GameUUID = typeof gameUUIDSchema.Type;

export const gameStatusSchema = Schema.Literal("start", "pending", "finish");
export type GameStatus = typeof gameStatusSchema.Type;

export const gameSchema = Schema.Struct({
  uuid: gameUUIDSchema,
  currentParty: partySchema,
  teamA: teamSchema,
  teamB: teamSchema,
  status: gameStatusSchema,
});

export type Game = typeof gameSchema.Type;
