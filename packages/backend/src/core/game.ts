import { Effect, Match, Option, pipe } from 'effect'
import { GameUUID } from 'shared/src/eventSchemas/datas/game'
import { Player } from 'shared/src/eventSchemas/datas/players'
import { GameStartedEvents } from 'shared/src/eventSchemas/server/serverEvents'
import { v4 as uuidv4 } from 'uuid'
import { retrieveWaitingPlayers, setPlayerStatus } from './state'

function initGame(
  players: [Player, Player, Player, Player],
): Effect.Effect<GameStartedEvents> {
  return pipe(
    Effect.succeed({
      uuid: uuidv4() as GameUUID,
      teams: [
        {
          name: 'BlackMamba',
          players: [players[0], players[2]],
          score: 0,
        },
        {
          name: 'RedDevil',
          players: [players[1], players[3]],
          score: 0,
        },
      ],
      playerOrder: players,
    }),
    Effect.andThen((game) =>
      Effect.forEach(players, (player) =>
        Effect.succeed({
          _tag: 'GameStartedEvent' as const,
          data: {
            playerUUID: player.uuid,
            game,
            hand: [],
            asset: undefined,
          },
        }),
      ),
    ),
    Effect.andThen((gameStartedEvents) => ({
      _tag: 'GameStartedEvents',
      data: gameStartedEvents,
    })),
  )
}

function searchAvailablePlayers(
  player: Player,
  numberOfPlayer: number,
): Effect.Effect<Option.Option<[Player, Player, Player, Player]>> {
  return pipe(
    Effect.promise(() => retrieveWaitingPlayers(numberOfPlayer - 1)),
    Effect.andThen((maybePlayers) =>
      Match.value(maybePlayers).pipe(
        Match.when(undefined, () =>
          pipe(
            Effect.promise(() =>
              setPlayerStatus(player.uuid, 'waitingForGame'),
            ),
            Effect.andThen(() => Effect.succeed(Option.none())),
          ),
        ),
        Match.orElse((players) =>
          pipe(
            Effect.promise(() => setPlayerStatus(player.uuid, 'playing')),
            Effect.andThen(() =>
              Effect.succeed(
                Option.some([player, ...players] as [
                  Player,
                  Player,
                  Player,
                  Player,
                ]),
              ),
            ),
          ),
        ),
      ),
    ),
  )
}

export function searchGame(
  player: Player,
  numberOfPlayer: number,
): Effect.Effect<Option.Option<GameStartedEvents>> {
  return pipe(
    searchAvailablePlayers(player, numberOfPlayer),
    Effect.andThen((maybePlayers) =>
      Option.match(maybePlayers, {
        onSome: (players) =>
          pipe(
            initGame(players),
            Effect.andThen((game) => Effect.succeed(Option.some(game))),
          ),
        onNone: () => Effect.succeed(Option.none()),
      }),
    ),
  )
}
