import { Mutex } from "async-mutex";
import { Player, PlayerUUID } from "shared/src/types/players";

type State = {
  waitingPlayers: Map<PlayerUUID, Player>;
};

export const state: State = {
  waitingPlayers: new Map(),
};

const waitingPlayersStateMutex = new Mutex();

export async function pushNewWaitingPlayer(
  newWaitingPlayer: Player,
): Promise<void> {
  const release = await waitingPlayersStateMutex.acquire();
  try {
    state.waitingPlayers.set(newWaitingPlayer.uuid, newWaitingPlayer);
  } finally {
    release();
  }
}

export async function retrieveWaitingPlayers(
  count: number,
): Promise<Player[] | undefined> {
  const release = await waitingPlayersStateMutex.acquire();
  try {
    if (state.waitingPlayers.size >= 3) {
      const players = Array.from(state.waitingPlayers.values()).splice(
        0,
        count,
      );
      players.map((player) => state.waitingPlayers.delete(player.uuid));
      return players;
    } else {
      return undefined;
    }
  } finally {
    release();
  }
}
