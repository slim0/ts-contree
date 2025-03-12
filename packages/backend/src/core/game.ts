import { Effect, Match, Option, pipe } from 'effect'
import { Game } from 'shared/src/eventSchemas/datas/game'
import { Player, Team } from 'shared/src/eventSchemas/datas/players'
import { retrieveWaitingPlayers, setPlayerStateToWaitingForGame } from './state'

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
    Effect.promise(() => retrieveWaitingPlayers(4)),
    Effect.andThen((maybePlayers) =>
      Match.value(maybePlayers).pipe(
        Match.when(undefined, () =>
          pipe(
            Effect.promise(() => setPlayerStateToWaitingForGame(player)),
            Effect.andThen(() => Effect.succeed(Option.none())),
          ),
        ),
        Match.orElse((players) =>
          Effect.succeed(
            Option.some(players as [Player, Player, Player, Player]),
          ),
        ),
      ),
    ),
  )
}

export function searchGameForPlayer(
  player: Player,
): Effect.Effect<Option.Option<Game>> {
  return pipe(
    Effect.promise(() => setPlayerStateToWaitingForGame(player)),
    Effect.andThen(() => getPlayers(player)),
    Effect.map((maybePlayers) =>
      Option.match(maybePlayers, {
        onSome: (players) => Option.some(initGame(players)),
        onNone: () => Option.none(),
      }),
    ),
  )
}
