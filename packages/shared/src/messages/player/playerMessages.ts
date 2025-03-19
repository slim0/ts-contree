import { Schema } from "@effect/schema";
import { betSchema } from "../datas/bid";
import { partyUUIDSchema } from "../datas/party";

const pingMessageSchema = Schema.Struct({
  _tag: Schema.tag("PingMessage"),
});

const playGameMessageSchema = Schema.Struct({
  _tag: Schema.tag("PlayGameMessage"),
});

const bidMessageDataSchema = Schema.Struct({
  partyUUID: partyUUIDSchema,
  bet: Schema.NullOr(betSchema),
});

const bidMessageSchema = Schema.Struct({
  _tag: Schema.tag("BidMessage"),
  data: bidMessageDataSchema,
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
