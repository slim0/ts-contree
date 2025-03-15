import { Schema } from "@effect/schema";
import { cardSchema } from "./cards";

export const foldSchema = Schema.Struct({
  cards: Schema.Array(cardSchema),
  isLastFold: Schema.Boolean,
});
export type Fold = typeof foldSchema.Type;
