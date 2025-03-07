import {
  deleteWaitingPlayer,
  pushNewWaitingPlayer,
  retrieveWaitingPlayers,
  state,
} from "backend/src/core/state";
import { Player, PlayerUUID } from "shared/src/types/players";
import { expect, test } from "vitest";

test("update waiting player state", async () => {
  const newPlayer1: Player = { uuid: "1" as PlayerUUID };
  const newPlayer2: Player = { uuid: "2" as PlayerUUID };
  const newPlayer3: Player = { uuid: "3" as PlayerUUID };

  expect(await retrieveWaitingPlayers(3)).toBe(undefined);

  await pushNewWaitingPlayer(newPlayer1);
  await pushNewWaitingPlayer(newPlayer2);

  expect(state.waitingPlayers.size).toBe(2);
  expect(await retrieveWaitingPlayers(3)).toBe(undefined);

  await pushNewWaitingPlayer(newPlayer3);

  const players = await retrieveWaitingPlayers(3);

  expect(players?.length).toBe(3);
  expect(await retrieveWaitingPlayers(3)).toBe(undefined);
  expect(state.waitingPlayers.size).toBe(0);
});

test("delete waiting player state", async () => {
  const player1: Player = { uuid: "1" as PlayerUUID };
  const player2: Player = { uuid: "2" as PlayerUUID };

  await pushNewWaitingPlayer(player1);
  await pushNewWaitingPlayer(player2);

  expect(state.waitingPlayers.size).toBe(2);

  await deleteWaitingPlayer(player1);

  expect(state.waitingPlayers.size).toBe(1);
})