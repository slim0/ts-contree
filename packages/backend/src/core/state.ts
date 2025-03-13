import { Mutex } from 'async-mutex'
import { Game, GameUUID } from 'shared/src/eventSchemas/datas/game'
import { Player, PlayerUUID } from 'shared/src/eventSchemas/datas/players'
import WebSocket from 'ws'

type PlayerStatus = 'connected' | 'waitingForGame' | 'playing'

type StatePlayer = {
  player: Player
  socket: WebSocket
  status: PlayerStatus
}

type State = {
  players: Map<PlayerUUID, StatePlayer>
  games: Map<GameUUID, { game: Game }>
}

export const state: State = {
  players: new Map(),
  games: new Map(),
}

const waitingPlayersStateMutex = new Mutex()

export async function addConnectedPlayer(
  player: Player,
  socket: WebSocket,
): Promise<void> {
  const release = await waitingPlayersStateMutex.acquire()
  try {
    state.players.set(player.uuid, { player, status: 'connected', socket })
  } finally {
    release()
  }
}

export async function getStatePlayer(
  playerUUID: PlayerUUID,
  alreadyLock: boolean,
): Promise<StatePlayer | undefined> {
  const release = alreadyLock ? null : await waitingPlayersStateMutex.acquire()
  try {
    const playerFromState = state.players.get(playerUUID)
    return playerFromState
  } finally {
    release && release()
  }
}

export async function setPlayerStatus(
  playerUUID: PlayerUUID,
  status: PlayerStatus,
): Promise<Map<PlayerUUID, StatePlayer> | undefined> {
  const release = await waitingPlayersStateMutex.acquire()
  try {
    const playerFromState = await getStatePlayer(playerUUID, true)
    return playerFromState !== undefined
      ? state.players.set(playerFromState.player.uuid, {
          ...playerFromState,
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
  const release = await waitingPlayersStateMutex.acquire()
  try {
    state.players.delete(waitingPlayer.uuid)
  } finally {
    release()
  }
}

export async function retrieveWaitingPlayers(
  count: number,
): Promise<Player[] | undefined> {
  const release = await waitingPlayersStateMutex.acquire()
  try {
    const waitingPlayers = Array.from(state.players.entries()).filter(
      ([_uuid, player]) => player.status === 'waitingForGame',
    )
    if (waitingPlayers.length >= count) {
      const players = waitingPlayers.splice(0, count)
      players.map(
        async ([_uuid, player]) =>
          await setPlayerStatus(player.player.uuid, 'playing'),
      )
      return players.map(([_uuid, player]) => player.player)
    } else {
      return undefined
    }
  } finally {
    release()
  }
}

export async function retrieveStatePlayers(
  playerUUIDs: PlayerUUID[],
): Promise<(StatePlayer | undefined)[]> {
  const release = await waitingPlayersStateMutex.acquire()
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
