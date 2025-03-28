import { Schema } from "@effect/schema";
import { betSchema } from "../datas/bid";
import { cardSchema } from "../datas/cards";
import { partyUUIDSchema } from "../datas/party";

const pingMessageSchema = Schema.Struct({
  _tag: Schema.tag("PingMessage"),
});

const playGameMessageSchema = Schema.Struct({
  _tag: Schema.tag("PlayGameMessage"),
});


const bidMessageSchema = Schema.Struct({
  _tag: Schema.tag("BidMessage"),
  data: Schema.Struct({
    partyUUID: partyUUIDSchema,
    bet: Schema.NullOr(betSchema),
  }),
});

const playCardMessageSchema = Schema.Struct({
  _tag: Schema.tag("PlayCardMessage"),
  data: Schema.Struct({
    partyUUID: partyUUIDSchema,
    card: cardSchema
  }),
});

export type BidMessage = typeof bidMessageSchema.Type;
export type PlayCardMessage = typeof playCardMessageSchema.Type;

export const playerMessageSchema = Schema.Union(
  pingMessageSchema,
  playGameMessageSchema,
  bidMessageSchema,
  playCardMessageSchema
);

export type PingMessage = typeof pingMessageSchema.Type;
export type PlayGameMessage = typeof playGameMessageSchema.Type;
export type PlayerMessage = typeof playerMessageSchema.Type;
