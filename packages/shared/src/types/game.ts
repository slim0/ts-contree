import { fourPlayers, teamValidator } from "./players";

import { z } from "zod";

export const gameValidator = z.object({
  teams: z.array(teamValidator).length(2),
  playerOrder: fourPlayers,
});

export type Game = z.infer<typeof gameValidator>;
