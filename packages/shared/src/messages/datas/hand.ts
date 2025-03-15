import { Schema } from "@effect/schema";
import { cardSchema } from "./cards";

export const handSchema = Schema.Array(cardSchema);
export type Hand = typeof handSchema.Type;
