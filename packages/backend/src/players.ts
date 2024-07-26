import { Color, Fold } from "shared/src/types/cards";
import { Team } from "shared/src/types/players";
import { countPointsCards } from "./cards";
import { Game } from "shared/src/types/game";

function countFoldPoints(fold: Fold, assetColor: Color): number {
  const foldPoints = countPointsCards(fold.cards, assetColor);
  return fold.isLastFold ? foldPoints + 10 : foldPoints;
}

export function winner(game: Game): Team | undefined {
  const teamA = game.teams[0];
  const teamB = game.teams[1];
  const score_to_win = 1000;
  if (teamA.score > score_to_win && teamB.score > score_to_win) {
    if (teamA.score > teamB.score) {
      return teamA;
    } else if (teamA.score === teamB.score) {
      return undefined;
    } else {
      return teamB;
    }
  } else {
    if (teamA.score > score_to_win) {
      return teamA;
    } else if (teamB.score > score_to_win) {
      return teamB;
    } else {
      return undefined;
    }
  }
}
