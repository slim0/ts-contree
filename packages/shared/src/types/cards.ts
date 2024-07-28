type SpadesColor = "spades";
type ClubsColor = "clubs";
type HeartsColor = "hearts";
type DiamondsColor = "diamonds";

export type Color = SpadesColor | ClubsColor | HeartsColor | DiamondsColor;

export type CardName =
  | "As"
  | "Seven"
  | "Eight"
  | "Nine"
  | "Ten"
  | "Jack"
  | "Queen"
  | "King";

export type Card = {
  name: CardName;
  color: Color;
};

export const asOfSpades: Card = {
  name: "As",
  color: "spades",
};

export const sevenOfSpades: Card = {
  name: "Seven",
  color: "spades",
};

export const eightOfSpades: Card = {
  name: "Eight",
  color: "spades",
};

export const nineOfSpades: Card = {
  name: "Nine",
  color: "spades",
};

export const tenOfSpades: Card = {
  name: "Ten",
  color: "spades",
};

export const jackOfSpades: Card = {
  name: "Jack",
  color: "spades",
};

export const queenOfSpades: Card = {
  name: "Queen",
  color: "spades",
};

export const kingOfSpades: Card = {
  name: "King",
  color: "spades",
};

export const asOfClubs: Card = {
  name: "As",
  color: "clubs",
};

export const sevenOfClubs: Card = {
  name: "Seven",
  color: "clubs",
};

export const eightOfClubs: Card = {
  name: "Eight",
  color: "clubs",
};

export const nineOfClubs: Card = {
  name: "Nine",
  color: "clubs",
};

export const tenOfClubs: Card = {
  name: "Ten",
  color: "clubs",
};

export const jackOfClubs: Card = {
  name: "Jack",
  color: "clubs",
};

export const queenOfClubs: Card = {
  name: "Queen",
  color: "clubs",
};

export const kingOfClubs: Card = {
  name: "King",
  color: "clubs",
};

export const asOfHearts: Card = {
  name: "As",
  color: "hearts",
};

export const sevenOfHearts: Card = {
  name: "Seven",
  color: "hearts",
};

export const eightOfHearts: Card = {
  name: "Eight",
  color: "hearts",
};

export const nineOfHearts: Card = {
  name: "Nine",
  color: "hearts",
};

export const tenOfHearts: Card = {
  name: "Ten",
  color: "hearts",
};

export const jackOfHearts: Card = {
  name: "Jack",
  color: "hearts",
};

export const queenOfHearts: Card = {
  name: "Queen",
  color: "hearts",
};

export const kingOfHearts: Card = {
  name: "King",
  color: "hearts",
};

export const asOfDiamonds: Card = {
  name: "As",
  color: "diamonds",
};

export const sevenOfDiamonds: Card = {
  name: "Seven",
  color: "diamonds",
};

export const eightOfDiamonds: Card = {
  name: "Eight",
  color: "diamonds",
};

export const nineOfDiamonds: Card = {
  name: "Nine",
  color: "diamonds",
};

export const tenOfDiamonds: Card = {
  name: "Ten",
  color: "diamonds",
};

export const jackOfDiamonds: Card = {
  name: "Jack",
  color: "diamonds",
};

export const queenOfDiamonds: Card = {
  name: "Queen",
  color: "diamonds",
};

export const kingOfDiamonds: Card = {
  name: "King",
  color: "diamonds",
};

export type Fold = {
  cards: [Card, Card, Card, Card];
  isLastFold: boolean;
};

export const deckOf32Cards = [
  asOfSpades,
  sevenOfSpades,
  eightOfSpades,
  nineOfSpades,
  tenOfSpades,
  jackOfSpades,
  queenOfSpades,
  kingOfSpades,
  asOfClubs,
  sevenOfClubs,
  eightOfClubs,
  nineOfClubs,
  tenOfClubs,
  jackOfClubs,
  queenOfClubs,
  kingOfClubs,
  asOfHearts,
  sevenOfHearts,
  eightOfHearts,
  nineOfHearts,
  tenOfHearts,
  jackOfHearts,
  queenOfHearts,
  kingOfHearts,
  asOfDiamonds,
  sevenOfDiamonds,
  eightOfDiamonds,
  nineOfDiamonds,
  tenOfDiamonds,
  jackOfDiamonds,
  queenOfDiamonds,
  kingOfDiamonds,
];
