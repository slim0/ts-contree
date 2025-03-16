import { Effect, Match, Option, pipe } from 'effect'
import { createGame } from './database/games'
import { createParty } from './database/parties'
import {
  PlayerState,
  retrieveWaitingPlayers,
  setPlayerStatus,
} from './database/players'
import { createTeam } from './database/teams'
import { InitializedGame } from './events'

function searchAvailablePlayers(
  connectedPlayerState: PlayerState,
): Effect.Effect<Option.Option<PlayerState[]>> {
  return pipe(
    Effect.promise(() => retrieveWaitingPlayers(3)),
    Effect.andThen((maybePlayers) =>
      Match.value(maybePlayers).pipe(
        Match.when(undefined, () =>
          pipe(
            Effect.promise(() =>
              setPlayerStatus(connectedPlayerState.uuid, 'waitingForGame'),
            ),
            Effect.andThen(() => Effect.succeed(Option.none())),
          ),
        ),
        Match.orElse((players) =>
          pipe(
            Effect.promise(() =>
              setPlayerStatus(connectedPlayerState.uuid, 'playing'),
            ),
            Effect.andThen(() =>
              Effect.succeed(Option.some([...players, connectedPlayerState!])),
            ),
          ),
        ),
      ),
    ),
  )
}

function initGame(players: PlayerState[]): Effect.Effect<InitializedGame> {
  return pipe(
    Effect.Do,
    Effect.bind('teamA', () =>
      Effect.promise(() =>
        createTeam('Red Devil', players[0].uuid, players[1].uuid),
      ),
    ),
    Effect.bind('teamB', () =>
      Effect.promise(() =>
        createTeam('Black Mamba', players[2].uuid, players[3].uuid),
      ),
    ),
    Effect.bind('game', ({ teamA, teamB }) =>
      Effect.promise(() => createGame(teamA.uuid, teamB.uuid)),
    ),
    Effect.bind('party', ({ game }) =>
      Effect.promise(() => createParty(game.uuid)),
    ),
    Effect.andThen(({ game, teamA, teamB, party }) => ({
      game,
      teamA,
      teamB,
      party,
      players,
    })),
  )
}

export function searchForNewGame(
  connectedPlayerState: PlayerState,
): Effect.Effect<Option.Option<InitializedGame>> {
  return pipe(
    searchAvailablePlayers(connectedPlayerState),
    Effect.andThen((maybePlayers) =>
      Option.match(maybePlayers, {
        onSome: (players) =>
          pipe(
            initGame(players),
            Effect.andThen((initializedGame) =>
              Effect.succeed(Option.some(initializedGame)),
            ),
          ),
        onNone: () => Effect.succeed(Option.none()),
      }),
    ),
  )
}
