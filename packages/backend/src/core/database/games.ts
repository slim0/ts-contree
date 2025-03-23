import { Mutex } from 'async-mutex'
import { Effect, pipe } from 'effect'
import { Game, GameStatus, GameUUID } from 'shared/src/messages/datas/game'
import { TeamUUID } from 'shared/src/messages/datas/team'
import { StateNotFoundErrorMessage } from 'shared/src/messages/server/serverMessages'
import { v4 as uuidv4 } from 'uuid'

export type GameState = {
  uuid: GameUUID
  row: Game
}

type GamesState = Map<GameUUID, Game>

export const gamesState: GamesState = new Map()

const mutex = new Mutex()

async function getGameState(
  gameUUID: GameUUID,
  alreadyLock: boolean = false,
): Promise<GameState> {
  const release = alreadyLock ? null : await mutex.acquire()
  try {
    const gameState = gamesState.get(gameUUID)
    return { uuid: gameUUID, row: gameState! }
  } finally {
    release && release()
  }
}

export function getGameStateEffect(
  gameUUID: GameUUID,
): Effect.Effect<GameState, StateNotFoundErrorMessage> {
  return pipe(
    Effect.promise(() => getGameState(gameUUID)),
    Effect.filterOrFail(
      (maybeGameState) => maybeGameState !== undefined,
      () => ({
        _tag: 'StateNotFoundErrorMessage' as const,
        message: `gameState with uuid=${gameUUID} not found`,
      }),
    ),
    Effect.map((gameState) => gameState),
  )
}

export async function createGame(
  teamA: TeamUUID,
  teamB: TeamUUID,
): Promise<GameState> {
  const release = await mutex.acquire()
  try {
    const uuid = uuidv4() as GameUUID
    const row = {
      uuid,
      teamA_UUID: teamA,
      teamB_UUID: teamB,
      status: 'playing' as GameStatus,
    }
    gamesState.set(uuid, row)
    return { uuid, row }
  } finally {
    release()
  }
}
