import { exhaustiveCheck } from "./typescript-tools"

type SpadesColor = "spades"
type ClubsColor = "clubs"
type HeartsColor = "hearts"
type DiamondsColor = "diamonds"

export type Color = SpadesColor | ClubsColor | HeartsColor | DiamondsColor

type CardName = "As" | "Seven" | "Eight" | "Nine" | "Ten" | "Jack" | "Queen" | "King"

export type Card = {
    name: CardName
    color: Color
}

const asOfSpades: Card = {
    name: "As",
    color: "spades"
}

const sevenOfSpades: Card = {
    name: "Seven",
    color: "spades"
}

const eightOfSpades: Card = {
    name: "Eight",
    color: "spades"
}

const nineOfSpades: Card = {
    name: "Nine",
    color: "spades"
}

const tenOfSpades: Card = {
    name: "Ten",
    color: "spades"
}

const jackOfSpades: Card = {
    name: "Jack",
    color: "spades"
}

const queenOfSpades: Card = {
    name: "Queen",
    color: "spades"
}

const kingOfSpades: Card = {
    name: "King",
    color: "spades"
}


const asOfClubs: Card = {
    name: "As",
    color: "clubs"
}

const sevenOfClubs: Card = {
    name: "Seven",
    color: "clubs"
}

const eightOfClubs: Card = {
    name: "Eight",
    color: "clubs"
}

const nineOfClubs: Card = {
    name: "Nine",
    color: "clubs"
}

const tenOfClubs: Card = {
    name: "Ten",
    color: "clubs"
}

const jackOfClubs: Card = {
    name: "Jack",
    color: "clubs"
}

const queenOfClubs: Card = {
    name: "Queen",
    color: "clubs"
}

const kingOfClubs: Card = {
    name: "King",
    color: "clubs"
}

const asOfHearts: Card = {
    name: "As",
    color: "hearts"
}

const sevenOfHearts: Card = {
    name: "Seven",
    color: "hearts"
}

const eightOfHearts: Card = {
    name: "Eight",
    color: "hearts"
}

const nineOfHearts: Card = {
    name: "Nine",
    color: "hearts"
}

const tenOfHearts: Card = {
    name: "Ten",
    color: "hearts"
}

const jackOfHearts: Card = {
    name: "Jack",
    color: "hearts"
}

const queenOfHearts: Card = {
    name: "Queen",
    color: "hearts"
}

const kingOfHearts: Card = {
    name: "King",
    color: "hearts"
}

const asOfDiamonds: Card = {
    name: "As",
    color: "diamonds"
}

const sevenOfDiamonds: Card = {
    name: "Seven",
    color: "diamonds"
}

const eightOfDiamonds: Card = {
    name: "Eight",
    color: "diamonds"
}

const nineOfDiamonds: Card = {
    name: "Nine",
    color: "diamonds"
}

const tenOfDiamonds: Card = {
    name: "Ten",
    color: "diamonds"
}

const jackOfDiamonds: Card = {
    name: "Jack",
    color: "diamonds"
}

const queenOfDiamonds: Card = {
    name: "Queen",
    color: "diamonds"
}

const kingOfDiamonds: Card = {
    name: "King",
    color: "diamonds"
}

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
]


function isCardAnAsset(card: Card, assetColor: Color): boolean {
    return card.color === assetColor
}

function calculateCardPoints(card: Card, assetColor: Color): number {
    const cardIsAnAsset = isCardAnAsset(card, assetColor)
    switch (card.name) {
        case "As":
            return 11
        case "King":
            return 4
        case "Queen":
            return 3
        case "Jack":
            return cardIsAnAsset ? 20 : 2
        case "Ten":
            return 10
        case "Nine":
            return cardIsAnAsset ? 14 : 0
        case "Eight":
        case "Seven":
            return 0
        default:
            exhaustiveCheck(card.name);
            throw Error("Unreachable code")
    }
}

const cardsNameAssetOrdered: CardName[] = ["Seven", "Eight", "Queen", "King", "Ten", "As", "Nine", "Jack"]
const cardsNameOrdered: CardName[] = ["Seven", "Eight", "Nine", "Jack", "Queen", "King", "Ten", "As"]

function findBestCardOfTwo(currentBestCard: Card, playedCard: Card, assetColor: Color): Card {
    if (isCardAnAsset(currentBestCard, assetColor)) {
        if (isCardAnAsset(playedCard, assetColor)) {
            return cardsNameAssetOrdered.indexOf(currentBestCard.name) > cardsNameAssetOrdered.indexOf(playedCard.name) ? currentBestCard : playedCard
        } else {
            return currentBestCard
        }
    } else {
        if (isCardAnAsset(playedCard, assetColor)) {
            return playedCard
        } else {
            if (currentBestCard.color === playedCard.color) {
                return cardsNameOrdered.indexOf(currentBestCard.name) > cardsNameOrdered.indexOf(playedCard.name) ? currentBestCard : playedCard
            } else {
                return currentBestCard
            }
        }
    }
}

function findBestCardInList(cards: [Card, ...Card[]], assetColor: Color): Card {
    return cards.reduce(
        (accumulator, currentCard) => findBestCardOfTwo(accumulator, currentCard, assetColor),
        cards[0],
    );
}


export function countPointsCards(cards: Card[], assetColor: Color): number {
    const totalPoints = 0
    return cards.reduce(
        (accumulator, currentCard) => accumulator + calculateCardPoints(currentCard, assetColor),
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
    return array
}

// TODO: tests
// console.log(findBestCard([nineOfHearts, tenOfHearts, jackOfHearts], "diamonds"))
// console.log(countPointsCards([nineOfHearts, tenOfHearts, jackOfHearts, jackOfDiamonds], "diamonds"))
// console.log(countPointsCards(deckOf32Cards, "diamonds"))
