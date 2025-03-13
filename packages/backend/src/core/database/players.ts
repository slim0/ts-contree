import { Mutex } from 'async-mutex'
import { Card } from 'shared/src/eventSchemas/datas/cards'
import { Player, PlayerUUID } from 'shared/src/eventSchemas/datas/players'
import WebSocket from 'ws'

type PlayerStatus = 'connected' | 'waitingForGame' | 'playing'

type PlayerState = {
  uuid: PlayerUUID
  connection: WebSocket
  status: PlayerStatus
  hand: Array<Card> | undefined
}

type PlayersState = Map<PlayerUUID, PlayerState>

export const playersState: PlayersState = new Map()

const playerStateMutex = new Mutex()

export async function addConnectedPlayer(
  player: Player,
  connection: WebSocket,
): Promise<void> {
  const release = await playerStateMutex.acquire()
  try {
    playersState.set(player.uuid, {
      uuid: player.uuid,
      status: 'connected',
      connection,
      hand: undefined,
    })
  } finally {
    release()
  }
}

export async function getStatePlayer(
  playerUUID: PlayerUUID,
  alreadyLock: boolean,
): Promise<PlayerState | undefined> {
  const release = alreadyLock ? null : await playerStateMutex.acquire()
  try {
    const playerState = playersState.get(playerUUID)
    return playerState
  } finally {
    release && release()
  }
}

export async function setPlayerStatus(
  playerUUID: PlayerUUID,
  status: PlayerStatus,
): Promise<Map<PlayerUUID, PlayerState> | undefined> {
  const release = await playerStateMutex.acquire()
  try {
    const playerState = await getStatePlayer(playerUUID, true)
    return playerState !== undefined
      ? playersState.set(playerUUID, {
          ...playerState,
          status: status,
        })
      : undefined
  } finally {
    release()
  }
}

export async function deletePlayerFromState(
  waitingPlayer: Player,
): Promise<void> {
  const release = await playerStateMutex.acquire()
  try {
    playersState.delete(waitingPlayer.uuid)
  } finally {
    release()
  }
}

export async function retrieveWaitingPlayers(
  count: number,
): Promise<PlayerState[] | undefined> {
  const release = await playerStateMutex.acquire()
  try {
    const waitingPlayers = Array.from(playersState.entries()).filter(
      ([_uuid, player]) => player.status === 'waitingForGame',
    )
    if (waitingPlayers.length >= count) {
      const players = waitingPlayers.splice(0, count)
      players.map(
        async ([_uuid, player]) =>
          await setPlayerStatus(player.uuid, 'playing'),
      )
      return players.map(([_uuid, player]) => player)
    } else {
      return undefined
    }
  } finally {
    release()
  }
}

export async function getStatePlayers(
  playerUUIDs: PlayerUUID[],
): Promise<(PlayerState | undefined)[]> {
  const release = await playerStateMutex.acquire()
  try {
    return await Promise.all(
      playerUUIDs.map(
        async (playerUUID) => await getStatePlayer(playerUUID, true),
      ),
    )
  } finally {
    release()
  }
}
