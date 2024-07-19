type SpadesColor = "spades"
type ClubsColor = "clubs"
type HeartsColor = "hearts"
type DiamondsColor = "diamonds"

export type Color = SpadesColor | ClubsColor | HeartsColor | DiamondsColor

export type CardName = "As" | "Seven" | "Eight" | "Nine" | "Ten" | "Jack" | "Queen" | "King"

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

export type Fold = {
    cards: [Card, Card, Card, Card],
    isLastFold: boolean
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