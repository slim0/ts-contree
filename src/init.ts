import { Card, deckOf32Cards, shuffleArray } from "./cards.js";
import { Game, Player, Players, Team, winner } from "./players.js";

function initPlayer(name: string, cards: Card[]): Player {
    return {
        name,
        hand: cards,
        folds: []
    };
}

function initTeam(name: string, playerA: Player, playerB: Player): Team {
    return {
        name,
        players: [playerA, playerB],
        score: 0
    }
}

function getDealer(game: Game): Player {
    return game.playerOrder[0]
}

function initGame(): Game {
    const shuffledCards = shuffleArray(deckOf32Cards)
    const playerA: Player = initPlayer("Simon", shuffledCards.slice(8));
    const playerB: Player = initPlayer("Étienne", shuffledCards.slice(8, 17));
    const playerC: Player = initPlayer("Hélène", shuffledCards.slice(17, 25));
    const playerD: Player = initPlayer("Tom", shuffledCards.slice(25, 32));
    const players: Players = [playerA, playerB, playerC, playerD]
    console.log(JSON.stringify(players))
    const teamA: Team = initTeam("Us", playerA, playerC)
    const teamB: Team = initTeam("Them", playerB, playerD)
    return {
        teams: [teamA, teamB],
        playerOrder: players
    }
}

function playGame(game: Game): Team {
    const winnerTeam = winner(game)
    while (winnerTeam === undefined) {
        console.log("continue")
        const firstPlayer = game.playerOrder[0]
        console.log(`${firstPlayer.name}, it's your turn:`)
    }
    return winnerTeam

}

function main() {
    const game = initGame()
    playGame(game)

}

main()