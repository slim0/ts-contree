import { Mutex } from "async-mutex";
import { Player } from "shared/src/types/players";

type State = {
  waitingPlayers: Player[];
};

export const state: State = {
  waitingPlayers: [],
};
const waitingPlayersStateMutex = new Mutex();

export async function retrieveWaitingPlayers(
  count: number,
): Promise<Player[] | undefined> {
  const release = await waitingPlayersStateMutex.acquire();
  try {
    if (state.waitingPlayers.length >= count) {
      return state.waitingPlayers.splice(0, count);
    } else {
      return undefined;
    }
  } finally {
    release();
  }
}

export async function pushNewWaitingPlayer(
  newWaitingPlayer: Player,
): Promise<void> {
  const release = await waitingPlayersStateMutex.acquire();
  try {
    state.waitingPlayers.push(newWaitingPlayer);
  } finally {
    release();
  }
}
