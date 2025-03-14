import { Schema } from '@effect/schema'
import { Mutex } from 'async-mutex'
import { PlayerUUID } from 'shared/src/eventSchemas/datas/players'
import { v4 as uuidv4 } from 'uuid'
import WebSocket from 'ws'

export const teamUUIDSchema = Schema.UUID.pipe(Schema.brand('PlayerUUID'))
export type TeamUUID = typeof teamUUIDSchema.Type

type TeamName = 'Red Devil' | 'Black Mamba'

type TeamState = {
  name: TeamName
  player1_UUID: PlayerUUID
  player2_UUID: PlayerUUID
  score: number
}

type TeamsState = Map<TeamUUID, TeamState>

export const teamsState: TeamsState = new Map()

const mutex = new Mutex()

export async function createTeam(
  name: TeamName,
  player1: PlayerUUID,
  player2: PlayerUUID,
  connection: WebSocket,
): Promise<void> {
  const release = await mutex.acquire()
  try {
    teamsState.set(uuidv4() as TeamUUID, {
      name: name,
      player1_UUID: player1,
      player2_UUID: player2,
      score: 0,
    })
  } finally {
    release()
  }
}
