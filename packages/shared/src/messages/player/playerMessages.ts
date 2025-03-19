import { Schema } from "@effect/schema";
import { betScoreSchema } from "../datas/bid";
import { assetSchema, partyUUIDSchema } from "../datas/party";

const pingMessageSchema = Schema.Struct({
  _tag: Schema.tag("PingMessage"),
});

const playGameMessageSchema = Schema.Struct({
  _tag: Schema.tag("PlayGameMessage"),
});

const bidMessageDataSchema = Schema.Struct({
  partyUUID: partyUUIDSchema,
  asset: assetSchema,
  betScore: betScoreSchema,
});

const bidMessageSchema = Schema.Struct({
  _tag: Schema.tag("BidMessage"),
  data: Schema.NullOr(bidMessageDataSchema),
});

export type BidMessage = typeof bidMessageSchema.Type;
export type BidMessageData = typeof bidMessageDataSchema.Type;

export const playerMessageSchema = Schema.Union(
  pingMessageSchema,
  playGameMessageSchema,
  bidMessageSchema,
);

export type PingMessage = typeof pingMessageSchema.Type;
export type PlayGameMessage = typeof playGameMessageSchema.Type;
export type PlayerMessage = typeof playerMessageSchema.Type;
