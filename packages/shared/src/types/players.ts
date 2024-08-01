import { z } from "zod";

const playerUUIDValidator = z.string().uuid().brand("PlayerUUID");
export type PlayerUUID = z.infer<typeof playerUUIDValidator>;

const playerValidator = z.object({
  uuid: playerUUIDValidator,
});

export type Player = z.infer<typeof playerValidator>;

export const fourPlayers = z.array(playerValidator).length(4);
export type FourPlayers = z.infer<typeof fourPlayers>;

const twoPlayers = z.array(playerValidator).length(2);
export type TwoPLayers = z.infer<typeof twoPlayers>;

export const teamValidator = z.object({
  name: z.string(),
  players: twoPlayers,
  score: z.number().nonnegative(),
});

export type Team = z.infer<typeof teamValidator>;
