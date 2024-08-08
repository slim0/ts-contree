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

function getThreeWaitingPlayers(): Effect.Effect<
  Option.Option<[Player, Player, Player]>,
  never,
  WaitingPlayerState
> {
  return WaitingPlayerState.pipe(
    Effect.andThen((waitingPlayersState) => Ref.get(waitingPlayersState)),
    Effect.map((waitingPlayersChunk) => {
      if (Chunk.size(waitingPlayersChunk) >= 3) {
        return Option.some(
          Chunk.toArray(Chunk.drop(waitingPlayersChunk, 3)) as [
            Player,
            Player,
            Player,
          ]
        );
      } else {
        return Option.none();
      }
    })
  );
}

export function searchGameForPlayer(
  player: Player
): Effect.Effect<Option.Option<Game>, never, WaitingPlayerState> {
  return WaitingPlayerState.pipe(
    getThreeWaitingPlayers,
    Effect.map((maybeThreePlayers) => {
      return Option.match(maybeThreePlayers, {
        onSome: (threePlayers) => {
          return Option.some(initGame([player, ...threePlayers]));
        },
        onNone: () => {
          return Option.none();
        },
      });
    })
  );
}
