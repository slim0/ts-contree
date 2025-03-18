import { Schema } from "@effect/schema";
import { assetSchema } from "./party";

export const bidUUIDSchema = Schema.UUID.pipe(Schema.brand("BidUUID"));
export type BidUUID = typeof bidUUIDSchema.Type;

export const bidSchema = Schema.Struct({
  uuid: bidUUIDSchema,
  asset: assetSchema,
  bet: Schema.Number,
});

export type Bid = typeof bidSchema.Type;
