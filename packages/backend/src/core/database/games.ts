import { Mutex } from 'async-mutex'
import { Effect, pipe } from 'effect'
import { GameStatus, GameUUID } from 'shared/src/messages/datas/game'
import { TeamUUID } from 'shared/src/messages/datas/team'
import { StateNotFoundErrorMessage } from 'shared/src/messages/server/serverMessages'
import { v4 as uuidv4 } from 'uuid'

type GameRow = {
  teamA_UUID: TeamUUID
  teamB_UUID: TeamUUID
  status: GameStatus
}

export type GameState = {
  uuid: GameUUID
  row: GameRow
}

type GamesState = Map<GameUUID, GameRow>

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
      teamA_UUID: teamA,
      teamB_UUID: teamB,
      status: 'start' as GameStatus,
    }
    gamesState.set(uuid, row)
    return { uuid, row }
  } finally {
    release()
  }
}
