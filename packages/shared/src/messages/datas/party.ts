import { Schema } from "@effect/schema";
import { colorSchema } from "./color";
import { foldSchema } from "./fold";

export const partyUUIDSchema = Schema.UUID.pipe(Schema.brand("PartyUUID"));
export type PartyUUID = typeof partyUUIDSchema.Type;

export const partyStatusSchema = Schema.Literal("start", "pending", "finish");
export type PartyStatus = typeof partyStatusSchema.Type;

export const assetSchema = Schema.NullOr(colorSchema);
export type Asset = typeof assetSchema.Type;

export const partySchema = Schema.Struct({
  uuid: partyUUIDSchema,
  folds: Schema.Array(foldSchema),
  status: partyStatusSchema,
  indexCurrentPlayer: Schema.Number,
});

export type Party = typeof partySchema.Type;
