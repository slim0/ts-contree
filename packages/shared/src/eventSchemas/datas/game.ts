import { Schema } from "@effect/schema";
import { colorSchema, handSchema } from "./cards";
import { playerSchema, playerUUIDSchema, teamSchema } from "./players";

const gameUUIDSchema = Schema.UUID.pipe(Schema.brand("GameUUID"));
export type GameUUID = typeof gameUUIDSchema.Type;

export const gameSchema = Schema.Struct({
  uuid: gameUUIDSchema,
  teams: Schema.Array(teamSchema).pipe(Schema.itemsCount(2)),
  playerOrder: Schema.Array(playerSchema).pipe(Schema.itemsCount(4)),
});

export const gameResponseSchema = Schema.Struct({
  playerUUID: playerUUIDSchema,
  game: gameSchema,
  hand: handSchema,
  asset: Schema.optional(colorSchema),
});

export type GameResponse = typeof gameResponseSchema.Type;

export type Game = typeof gameSchema.Type;
