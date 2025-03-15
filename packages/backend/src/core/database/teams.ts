import { Mutex } from 'async-mutex'
import { PlayerUUID } from 'shared/src/messages/datas/player'
import { TeamName, TeamScore, TeamUUID } from 'shared/src/messages/datas/team'
import { v4 as uuidv4 } from 'uuid'

export type TeamRow = {
  name: TeamName
  player1_UUID: PlayerUUID
  player2_UUID: PlayerUUID
  score: TeamScore
}
export type TeamState = {
  uuid: TeamUUID
  row: TeamRow
}

type TeamsState = Map<TeamUUID, TeamRow>

export const teamsState: TeamsState = new Map()

const mutex = new Mutex()

export async function createTeam(
  name: TeamName,
  player1: PlayerUUID,
  player2: PlayerUUID,
): Promise<TeamState> {
  const release = await mutex.acquire()
  try {
    const uuid = uuidv4() as TeamUUID
    const row = {
      name: name,
      player1_UUID: player1,
      player2_UUID: player2,
      score: 0,
    }
    teamsState.set(uuid, row)
    return {
      uuid,
      row,
    }
  } finally {
    release()
  }
}
