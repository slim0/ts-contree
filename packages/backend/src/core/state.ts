import { Player } from "shared/src/types/players";

type State = {
  waitingPlayers: Player[];
};
export const state: State = {
  waitingPlayers: [],
};
