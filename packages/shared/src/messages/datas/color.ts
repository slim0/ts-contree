import { Schema } from "@effect/schema";

const spadesColorSchema = Schema.Literal("spades");
const clubsColorSchema = Schema.Literal("clubs");
const heartsColorSchema = Schema.Literal("hearts");
const diamondsColorSchema = Schema.Literal("diamonds");

export const colorSchema = Schema.Union(
  spadesColorSchema,
  clubsColorSchema,
  heartsColorSchema,
  diamondsColorSchema,
);

export type Color = typeof colorSchema.Type;
