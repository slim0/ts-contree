import { expect, test } from "vitest";
import { countPointsCards, findBestCardInList } from "backend/src/cards";
import {
  deckOf32Cards,
  jackOfHearts,
  nineOfHearts,
  tenOfHearts,
} from "shared/src/types/cards";

test("find best card in list without assets", () => {
  expect(
    findBestCardInList([nineOfHearts, tenOfHearts, jackOfHearts], "diamonds")
  ).toBe(tenOfHearts);
});

test("find best card in list with assets", () => {
  expect(
    findBestCardInList([nineOfHearts, tenOfHearts, jackOfHearts], "hearts")
  ).toBe(jackOfHearts);
});

test("count total points in deck of 32 cards", () => {
  expect(countPointsCards(deckOf32Cards, "diamonds")).toBe(152);
});
