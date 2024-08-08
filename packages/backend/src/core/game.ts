import { Chunk, Effect, Option, Ref } from "effect";
import { Game } from "shared/src/types/game";
import { Player, Team } from "shared/src/types/players";
import { WaitingPlayerState } from "./state";

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
  player: Player
): Effect.Effect<Option.Option<Game>, never, WaitingPlayerState> {
  return WaitingPlayerState.pipe(
    Effect.bind("players", (ref) => {
      const chunk = Ref.get(ref);
      return chunk.pipe(Effect.tap((el) => Chunk.drop(el, 3)));
    }),
    Effect.map(({ players }) => {
      const readonlyArray = Chunk.toReadonlyArray(players);
      const player2 = readonlyArray[0];
      const player3 = readonlyArray[1];
      const player4 = readonlyArray[2];
      return Option.some(initGame([player, player2, player3, player4]));
    })
  );
}
