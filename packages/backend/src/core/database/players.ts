import { Mutex } from 'async-mutex'
import { Effect, pipe } from 'effect'
import {
  Player,
  PlayerStatus,
  PlayerUUID,
} from 'shared/src/messages/datas/player'
import WebSocket from 'ws'
import { getPlayers } from './parties'
import { TeamState } from './teams'

type PlayerRow = Player & {
  connection: WebSocket
}

export type PlayerState = { uuid: PlayerUUID; row: PlayerRow }

type PlayersState = Map<PlayerUUID, PlayerRow>

export const playersState: PlayersState = new Map()

const mutex = new Mutex()

export async function addConnectedPlayer(
  playerUUID: PlayerUUID,
  connection: WebSocket,
): Promise<PlayerState> {
  const release = await mutex.acquire()
  try {
    const playerState: PlayerState = {
      uuid: playerUUID,
      row: {
        uuid: playerUUID,
        status: 'connected',
        connection,
        hand: [],
      },
    }
    playersState.set(playerState.uuid, playerState.row)
    return playerState
  } finally {
    release()
  }
}

export async function getStatePlayer(
  playerUUID: PlayerUUID,
  alreadyLock: boolean = false,
): Promise<PlayerState> {
  const release = alreadyLock ? null : await mutex.acquire()
  try {
    const playerState = playersState.get(playerUUID)
    return { uuid: playerUUID, row: playerState! }
  } finally {
    release && release()
  }
}

export async function setPlayerStatus(
  playerUUID: PlayerUUID,
  status: PlayerStatus,
): Promise<void> {
  const release = await mutex.acquire()
  try {
    const playerState = await getStatePlayer(playerUUID, true)
    playerState !== undefined &&
      playersState.set(playerUUID, {
        ...playerState.row,
        status: status,
      })
  } finally {
    release()
  }
}

export async function deletePlayerFromState(
  playerUUID: PlayerUUID,
): Promise<void> {
  const release = await mutex.acquire()
  try {
    playersState.delete(playerUUID)
  } finally {
    release()
  }
}

export async function retrieveWaitingPlayers(
  count: number,
): Promise<PlayerState[] | undefined> {
  const release = await mutex.acquire()
  try {
    const waitingPlayers = Array.from(playersState.entries()).filter(
      ([_uuid, player]) => player.status === 'waitingForGame',
    )
    if (waitingPlayers.length >= count) {
      const players = waitingPlayers.splice(0, count)
      players.map(
        async ([playerUUID, _player]) =>
          await setPlayerStatus(playerUUID, 'playing'),
      )
      return players.map(([playerUUID, playerRow]) => ({
        uuid: playerUUID,
        row: playerRow,
      }))
    } else {
      return undefined
    }
  } finally {
    release()
  }
}

export function getStatePlayers(
  teamA_State: TeamState,
  teamB_State: TeamState,
) {
  return pipe(
    getPlayers(teamA_State.row, teamB_State.row),
    Effect.andThen((playerUUIDs) =>
      Effect.forEach(playerUUIDs, (playerUUID) => {
        return Effect.promise(() => getStatePlayer(playerUUID, false))
      }),
    ),
  )
}
