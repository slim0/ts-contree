import { Schema } from "@effect/schema";
import { playerUUIDSchema } from "./player";

export const teamUUIDSchema = Schema.UUID.pipe(Schema.brand("PlayerUUID"));
export type TeamUUID = typeof teamUUIDSchema.Type;

export const teamNameSchema = Schema.Literal("Red Devil", "Black Mamba");
export type TeamName = typeof teamNameSchema.Type;

export const teamScoreSchema = Schema.Number;
export type TeamScore = typeof teamScoreSchema.Type;

export const teamSchema = Schema.Struct({
  uuid: teamUUIDSchema,
  name: teamNameSchema,
  player1_UUID: playerUUIDSchema,
  player2_UUID: playerUUIDSchema,
  score: teamScoreSchema,
});

export type Team = typeof teamSchema.Type;
