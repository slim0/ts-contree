import { Card, Color, countPointsCards } from "./cards.js"

type Fold = {
    cards: [Card, Card, Card, Card],
    isLastFold: boolean
}

function countFoldPoints(fold: Fold, assetColor: Color): number {
    const foldPoints = countPointsCards(fold.cards, assetColor)
    return fold.isLastFold ? foldPoints + 10 : foldPoints
}

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

export function winner(game: Game): Team | undefined {
    const teamA = game.teams[0]
    const teamB = game.teams[1]
    const score_to_win = 1000
    if (teamA.score > score_to_win && teamB.score > score_to_win) {
        if (teamA.score > teamB.score) {
            return teamA
        } else if (teamA.score === teamB.score) {
            return undefined
        } else {
            return teamB
        }
    } else {
        if (teamA.score > score_to_win) {
            return teamA
        } else if (teamB.score > score_to_win) {
            return teamB
        } else {
            return undefined
        }
    }
}

export type Game = {
    teams: [Team, Team],
    playerOrder: Players
}


