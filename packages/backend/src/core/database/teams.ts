import { Mutex } from 'async-mutex'
import { Effect, pipe } from 'effect'
import { PlayerUUID } from 'shared/src/messages/datas/player'
import { Team, TeamName, TeamUUID } from 'shared/src/messages/datas/team'
import { StateNotFoundErrorMessage } from 'shared/src/messages/server/serverMessages'
import { v4 as uuidv4 } from 'uuid'

export type TeamState = {
  uuid: TeamUUID
  row: Team
}

type TeamsState = Map<TeamUUID, Team>

export const teamsState: TeamsState = new Map()

const mutex = new Mutex()

async function getTeamState(
  teamUUID: TeamUUID,
  alreadyLock: boolean = false,
): Promise<TeamState> {
  const release = alreadyLock ? null : await mutex.acquire()
  try {
    const teamState = teamsState.get(teamUUID)
    return { uuid: teamUUID, row: teamState! }
  } finally {
    release && release()
  }
}

export function getTeamStateEffect(
  teamUUID: TeamUUID,
): Effect.Effect<TeamState, StateNotFoundErrorMessage> {
  return pipe(
    Effect.promise(() => getTeamState(teamUUID)),
    Effect.filterOrFail(
      (maybeTeamState) => maybeTeamState !== undefined,
      () => ({
        _tag: 'StateNotFoundErrorMessage' as const,
        message: `teamState with uuid=${teamUUID} not found`,
      }),
    ),
    Effect.map((teamState) => teamState),
  )
}

export async function createTeam(
  name: TeamName,
  player1: PlayerUUID,
  player2: PlayerUUID,
): Promise<TeamState> {
  const release = await mutex.acquire()
  try {
    const uuid = uuidv4() as TeamUUID
    const row = {
      uuid,
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
