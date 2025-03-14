import { Schema } from '@effect/schema'
import { Mutex } from 'async-mutex'
import { v4 as uuidv4 } from 'uuid'
import { TeamUUID } from './teams'

export const gameUUIDSchema = Schema.UUID.pipe(Schema.brand('GameUUID'))
export type GameUUID = typeof gameUUIDSchema.Type

type GameStatus = 'start' | 'pending' | 'finish'

type GameState = {
  teamA_UUID: TeamUUID
  teamB_UUID: TeamUUID
  status: GameStatus
}

type GamesState = Map<GameUUID, GameState>

export const gamesState: GamesState = new Map()

const mutex = new Mutex()

export async function createGame(
  teamA: TeamUUID,
  teamB: TeamUUID,
): Promise<void> {
  const release = await mutex.acquire()
  try {
    gamesState.set(uuidv4() as GameUUID, {
      teamA_UUID: teamA,
      teamB_UUID: teamB,
      status: 'start',
    })
  } finally {
    release()
  }
}
