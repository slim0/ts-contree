import { exhaustiveCheck } from "./typescript-tools";
import { Card, Color, CardName } from "shared/src/cards";

function isCardAnAsset(card: Card, assetColor: Color): boolean {
  return card.color === assetColor;
}

function calculateCardPoints(card: Card, assetColor: Color): number {
  const cardIsAnAsset = isCardAnAsset(card, assetColor);
  switch (card.name) {
    case "As":
      return 11;
    case "King":
      return 4;
    case "Queen":
      return 3;
    case "Jack":
      return cardIsAnAsset ? 20 : 2;
    case "Ten":
      return 10;
    case "Nine":
      return cardIsAnAsset ? 14 : 0;
    case "Eight":
    case "Seven":
      return 0;
    default:
      exhaustiveCheck(card.name);
      throw Error("Unreachable code");
  }
}

const cardsNameAssetOrdered: CardName[] = [
  "Seven",
  "Eight",
  "Queen",
  "King",
  "Ten",
  "As",
  "Nine",
  "Jack",
];
const cardsNameOrdered: CardName[] = [
  "Seven",
  "Eight",
  "Nine",
  "Jack",
  "Queen",
  "King",
  "Ten",
  "As",
];

function findBestCardOfTwo(
  currentBestCard: Card,
  playedCard: Card,
  assetColor: Color,
): Card {
  if (isCardAnAsset(currentBestCard, assetColor)) {
    if (isCardAnAsset(playedCard, assetColor)) {
      return cardsNameAssetOrdered.indexOf(currentBestCard.name) >
        cardsNameAssetOrdered.indexOf(playedCard.name)
        ? currentBestCard
        : playedCard;
    } else {
      return currentBestCard;
    }
  } else {
    if (isCardAnAsset(playedCard, assetColor)) {
      return playedCard;
    } else {
      if (currentBestCard.color === playedCard.color) {
        return cardsNameOrdered.indexOf(currentBestCard.name) >
          cardsNameOrdered.indexOf(playedCard.name)
          ? currentBestCard
          : playedCard;
      } else {
        return currentBestCard;
      }
    }
  }
}

function findBestCardInList(cards: [Card, ...Card[]], assetColor: Color): Card {
  return cards.reduce(
    (accumulator, currentCard) =>
      findBestCardOfTwo(accumulator, currentCard, assetColor),
    cards[0],
  );
}

export function countPointsCards(cards: Card[], assetColor: Color): number {
  const totalPoints = 0;
  return cards.reduce(
    (accumulator, currentCard) =>
      accumulator + calculateCardPoints(currentCard, assetColor),
    totalPoints,
  );
}

export function shuffleArray<A>(array: A[]): A[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

// TODO: tests
// console.log(findBestCard([nineOfHearts, tenOfHearts, jackOfHearts], "diamonds"))
// console.log(countPointsCards([nineOfHearts, tenOfHearts, jackOfHearts, jackOfDiamonds], "diamonds"))
// console.log(countPointsCards(deckOf32Cards, "diamonds"))
