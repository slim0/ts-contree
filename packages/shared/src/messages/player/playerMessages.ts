import { Schema } from "@effect/schema";
import { assetSchema } from "../datas/party";

const pingMessageSchema = Schema.Struct({
  _tag: Schema.tag("PingMessage"),
});

const playGameMessageSchema = Schema.Struct({
  _tag: Schema.tag("PlayGameMessage"),
});

const bidMessageSchema = Schema.Struct({
  _tag: Schema.tag("BidMessage"),
  data: Schema.NullOr(
    Schema.Struct({
      asset: assetSchema,
      targetScore: Schema.Number,
    }),
  ),
});

export const playerMessageSchema = Schema.Union(
  pingMessageSchema,
  playGameMessageSchema,
  bidMessageSchema,
);

export type PingMessage = typeof pingMessageSchema.Type;
export type PlayGameMessage = typeof playGameMessageSchema.Type;
export type PlayerMessage = typeof playerMessageSchema.Type;
