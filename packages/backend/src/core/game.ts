import { Effect, Match, Option, pipe } from 'effect'
import { deckOf32Cards } from 'shared/src/messages/datas/cards'
import { GameStartedMessage } from 'shared/src/messages/server/serverMessages'
import { distributeCards } from './cards'
import { createGame, GameState } from './database/games'
import { createParty, PartyState } from './database/parties'
import {
  PlayerState,
  retrieveWaitingPlayers,
  setPlayerStatus,
} from './database/players'
import { createTeam, TeamState } from './database/teams'
import { ServerResponse } from './types'

export type InitializedGameStates = {
  game: GameState
  teamA: TeamState
  teamB: TeamState
  party: PartyState
  players: PlayerState[]
}

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

function initializeGame(
  players: PlayerState[],
): Effect.Effect<InitializedGameStates> {
  return pipe(
    Effect.Do,
    Effect.bind('teamA', () =>
      Effect.promise(() =>
        createTeam('Red Devil', players[0].uuid, players[2].uuid),
      ),
    ),
    Effect.bind('teamB', () =>
      Effect.promise(() =>
        createTeam('Black Mamba', players[1].uuid, players[3].uuid),
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
): Effect.Effect<Option.Option<InitializedGameStates>> {
  return pipe(
    searchAvailablePlayers(connectedPlayerState),
    Effect.andThen((maybePlayers) =>
      Option.match(maybePlayers, {
        onSome: (playersState) =>
          pipe(
            initializeGame(playersState),
            Effect.andThen((states) => Effect.succeed(Option.some(states))),
          ),
        onNone: () => Effect.succeed(Option.none()),
      }),
    ),
  )
}

export function gameStartedResponses(
  initializedGameStates: InitializedGameStates,
): Effect.Effect<Array<ServerResponse<GameStartedMessage>>> {
  return pipe(
    distributeCards(deckOf32Cards),
    Effect.andThen((distributedCards) =>
      Effect.forEach(initializedGameStates.players, (playerState, index) =>
        Effect.succeed({
          playerState,
          data: {
            _tag: 'GameStartedMessage' as const,
            data: {
              game: initializedGameStates.game.row,
              teamA: initializedGameStates.teamA.row,
              teamB: initializedGameStates.teamB.row,
              party: initializedGameStates.party.row,
              hand: distributedCards[index],
            },
          },
        }),
      ),
    ),
  )
}
