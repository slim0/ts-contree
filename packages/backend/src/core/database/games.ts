import { Mutex } from 'async-mutex'
import { GameStatus, GameUUID } from 'shared/src/messages/datas/game'
import { TeamUUID } from 'shared/src/messages/datas/team'
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
