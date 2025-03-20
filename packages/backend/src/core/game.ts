import { Effect, Match, Option, pipe } from 'effect'
import { deckOf32Cards } from 'shared/src/messages/datas/cards'
import { Game } from 'shared/src/messages/datas/game'
import { TeamPlayer } from 'shared/src/messages/datas/team'
import { GameStartedMessage } from 'shared/src/messages/server/serverMessages'
import { distributeCards } from './cards'
import { createGame } from './database/games'
import { createParty } from './database/parties'
import {
  PlayerState,
  retrieveWaitingPlayers,
  setPlayerStatus,
} from './database/players'
import { createTeam } from './database/teams'
import { InitializedGame, ServerResponse } from './types'

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
): Effect.Effect<InitializedGame> {
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
): Effect.Effect<Option.Option<InitializedGame>> {
  return pipe(
    searchAvailablePlayers(connectedPlayerState),
    Effect.andThen((maybePlayers) =>
      Option.match(maybePlayers, {
        onSome: (players) =>
          pipe(
            initializeGame(players),
            Effect.andThen((initializedGame) =>
              Effect.succeed(Option.some(initializedGame)),
            ),
          ),
        onNone: () => Effect.succeed(Option.none()),
      }),
    ),
  )
}
export function constructGameFromInitializedGame(
  initializedGame: InitializedGame,
): Effect.Effect<Game> {
  return Effect.succeed({
    uuid: initializedGame.game.uuid,
    status: initializedGame.game.row.status,
    teamA: {
      uuid: initializedGame.teamA.uuid,
      name: initializedGame.teamA.row.name,
      player1: {
        uuid: initializedGame.teamA.row.player1_UUID,
      },
      player2: {
        uuid: initializedGame.teamA.row.player2_UUID,
      },
      score: initializedGame.teamA.row.score,
    },
    teamB: {
      uuid: initializedGame.teamB.uuid,
      name: initializedGame.teamB.row.name,
      player1: {
        uuid: initializedGame.teamB.row.player1_UUID,
      } as TeamPlayer,
      player2: {
        uuid: initializedGame.teamB.row.player2_UUID,
      } as TeamPlayer,
      score: initializedGame.teamB.row.score,
    },
    currentParty: {
      uuid: initializedGame.party.uuid,
      status: initializedGame.party.row.status,
      indexCurrentPlayer: initializedGame.party.row.indexCurrentPlayer,
      folds: initializedGame.party.row.folds,
    },
  })
}
export function gameStartedResponsesFromInitializedGame(
  initializedGame: InitializedGame,
): Effect.Effect<Array<ServerResponse<GameStartedMessage>>> {
  return pipe(
    constructGameFromInitializedGame(initializedGame),
    Effect.andThen((game) =>
      pipe(
        distributeCards(deckOf32Cards),
        Effect.andThen((distributedCards) =>
          Effect.forEach(initializedGame.players, (playerState, index) =>
            Effect.succeed({
              playerState,
              data: {
                _tag: 'GameStartedMessage' as const,
                data: {
                  game,
                  hand: distributedCards[index],
                },
              },
            }),
          ),
        ),
      ),
    ),
  )
}
