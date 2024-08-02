import { Effect, Option } from "effect";
import { Game } from "shared/src/types/game";
import { Player, Team } from "shared/src/types/players";

function initGame(players: [Player, Player, Player, Player]): Game {
  const teamA: Team = {
    name: "TeamA",
    players: [players[0], players[2]],
    score: 0,
  };
  const teamB: Team = {
    name: "TeamB",
    players: [players[1], players[3]],
    score: 0,
  };
  return {
    teams: [teamA, teamB],
    playerOrder: players,
  };
}

export function searchGameForPlayer(
  player: Player,
  waitingPlayers: Player[]
): Effect.Effect<Option.Option<Game>> {
  return Effect.succeed(
    initGame([
      player,
      waitingPlayers.shift()!,
      waitingPlayers.shift()!,
      waitingPlayers.shift()!,
    ])
  ).pipe(Effect.when(() => waitingPlayers.length >= 3));
}
