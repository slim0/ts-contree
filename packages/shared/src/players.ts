import { Card, Fold } from "./cards"

export type Player = {
    name: string,
    hand: Card[],
    folds: Fold[]
}

export type Players = [Player, Player, Player, Player]

export type Team = {
    name: string,
    players: [Player, Player]
    score: number
}