import { Effect, Match, Option, pipe } from 'effect'
import { deckOf32Cards } from 'shared/src/messages/datas/cards'
import {
  PendingGameMessage,
  PlayerStatusErrorMessage,
  WaitingForGameMessage,
} from 'shared/src/messages/server/serverMessages'
import { distributeCards } from '../core/cards'
import { GameState, createGame } from '../core/database/games'
import { PartyState, createParty } from '../core/database/parties'
import {
  PlayerState,
  retrieveWaitingPlayers,
  setPlayerStatus,
} from '../core/database/players'
import { TeamState, createTeam } from '../core/database/teams'
import { ServerResponse } from '../core/types'
import { verifyPlayerStatus } from './common'

type InitializedGameStates = {
  game: GameState
  teamA: TeamState
  teamB: TeamState
  party: PartyState
  players: PlayerState[]
}

function gameStartedResponses(
  initializedGameStates: InitializedGameStates,
): Effect.Effect<Array<ServerResponse<PendingGameMessage>>> {
  return pipe(
    distributeCards(deckOf32Cards),
    Effect.andThen((distributedCards) =>
      Effect.forEach(initializedGameStates.players, (playerState, index) =>
        Effect.succeed({
          playerState,
          data: {
            _tag: 'PendingGameMessage' as const,
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

function searchForNewGame(
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

export function onPlayGameMessage(
  connectedPlayerState: PlayerState,
): Effect.Effect<
  Array<ServerResponse<WaitingForGameMessage | PendingGameMessage>>,
  PlayerStatusErrorMessage
> {
  return pipe(
    verifyPlayerStatus(connectedPlayerState, ['connected']),
    Effect.andThen(() => searchForNewGame(connectedPlayerState)),
    Effect.andThen((maybeInitializedGameStates) =>
      Option.match(maybeInitializedGameStates, {
        onSome: (initializedGameStates) =>
          gameStartedResponses(initializedGameStates),
        onNone: () =>
          Effect.succeed([
            {
              playerState: connectedPlayerState,
              data: {
                _tag: 'WaitingForGameMessage' as const,
              },
            },
          ]),
      }),
    ),
  )
}
