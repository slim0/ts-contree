import { Schema } from "@effect/schema";
import { assetSchema, partyUUIDSchema } from "./party";

export const bidUUIDSchema = Schema.UUID.pipe(Schema.brand("BidUUID"));
export type BidUUID = typeof bidUUIDSchema.Type;

export const betScoreSchema = Schema.Literal(
  80,
  90,
  100,
  110,
  120,
  130,
  140,
  150,
  160,
);

export type BetScore = typeof betScoreSchema.Type;

export const bidSchema = Schema.Struct({
  uuid: bidUUIDSchema,
  partyUUID: partyUUIDSchema,
  asset: assetSchema,
  betScore: betScoreSchema,
});

export type Bid = typeof bidSchema.Type;
