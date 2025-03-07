import { Effect, Option, pipe } from 'effect'
import { Game } from 'shared/src/types/game'
import { Player, Team } from 'shared/src/types/players'
import { pushNewWaitingPlayer, retrieveWaitingPlayers } from './state'

function initGame(players: [Player, Player, Player, Player]): Game {
  const teamA: Team = {
    name: 'TeamA',
    players: [players[0], players[2]],
    score: 0,
  }
  const teamB: Team = {
    name: 'TeamB',
    players: [players[1], players[3]],
    score: 0,
  }
  return {
    teams: [teamA, teamB],
    playerOrder: players,
  }
}

function getPlayers(
  player: Player,
): Effect.Effect<Option.Option<[Player, Player, Player, Player]>> {
  return pipe(
    Effect.promise(() => retrieveWaitingPlayers(3)),
    Effect.andThen((maybePlayers) =>
      maybePlayers !== undefined
        ? Effect.succeed(
            Option.some([player, ...maybePlayers!] as [
              Player,
              Player,
              Player,
              Player,
            ]),
          )
        : pipe(
            Effect.promise(() => pushNewWaitingPlayer(player)),
            Effect.andThen(() => Effect.succeed(Option.none())),
          ),
    ),
  )
}

export function searchGameForPlayer(
  player: Player,
): Effect.Effect<Option.Option<Game>> {
  return pipe(
    getPlayers(player),
    Effect.map((maybePlayers) =>
      Option.match(maybePlayers, {
        onSome: (players) => Option.some(initGame(players)),
        onNone: () => Option.none(),
      }),
    ),
  )
}
