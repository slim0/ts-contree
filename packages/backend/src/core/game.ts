import { Effect, Match, Option, pipe } from 'effect'
import { createGame } from './database/games'
import { createParty } from './database/parties'
import {
  getStatePlayer,
  PlayerState,
  retrieveWaitingPlayers,
  setPlayerStatus,
} from './database/players'
import { createTeam } from './database/teams'
import { GameStartedEventData } from './events'

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
              getStatePlayer(connectedPlayerState.uuid, false),
            ),
            Effect.tap(() =>
              Effect.promise(() =>
                setPlayerStatus(connectedPlayerState.uuid, 'playing'),
              ),
            ),
            Effect.andThen((statePlayer) =>
              Effect.succeed(Option.some([...players, statePlayer!])),
            ),
          ),
        ),
      ),
    ),
  )
}

export function searchForNewGame(
  connectedPlayerState: PlayerState,
): Effect.Effect<Option.Option<GameStartedEventData>> {
  return pipe(
    searchAvailablePlayers(connectedPlayerState),
    Effect.andThen((maybePlayers) =>
      Option.match(maybePlayers, {
        onSome: (players) =>
          pipe(
            Effect.Do,
            Effect.bind('teamA', () =>
              Effect.promise(() =>
                createTeam('Black Mamba', players[0].uuid, players[1].uuid),
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
            Effect.andThen(({ game, teamA, teamB, party }) =>
              Effect.succeed(
                Option.some({ game, teamA, teamB, party, players }),
              ),
            ),
          ),
        onNone: () => Effect.succeed(Option.none()),
      }),
    ),
  )
}
