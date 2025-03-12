import { Mutex } from 'async-mutex'
import { Game, GameUUID } from 'shared/src/eventSchemas/datas/game'
import { Player, PlayerUUID } from 'shared/src/eventSchemas/datas/players'
import WebSocket from 'ws'

type State = {
  players: Map<
    PlayerUUID,
    {
      player: Player
      socket: WebSocket
      state: 'connected' | 'waitingForGame' | 'playing'
    }
  >
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
    state.players.set(player.uuid, { player, state: 'connected', socket })
  } finally {
    release()
  }
}

export async function setPlayerStateToWaitingForGame(
  player: Player,
): Promise<void> {
  const release = await waitingPlayersStateMutex.acquire()
  const playerFromState = state.players.get(player.uuid)
  try {
    state.players.set(player.uuid, {
      player,
      socket: playerFromState!.socket,
      state: 'waitingForGame',
    })
  } finally {
    release()
  }
}

export async function setPlayerStateToPlaying(player: Player): Promise<void> {
  const release = await waitingPlayersStateMutex.acquire()
  const playerFromState = state.players.get(player.uuid)
  try {
    state.players.set(player.uuid, {
      player,
      socket: playerFromState!.socket,
      state: 'playing',
    })
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
      ([uuid, player]) => player.state === 'waitingForGame',
    )
    if (waitingPlayers.length >= count) {
      const players = waitingPlayers.splice(0, count)
      players.map(
        async ([_uuid, player]) => await setPlayerStateToPlaying(player.player),
      )
      return players.map(([_uuid, player]) => player.player)
    } else {
      return undefined
    }
  } finally {
    release()
  }
}
