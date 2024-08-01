import { z } from "zod";
import { gameValidator } from "../types/game";

// Client
export const eventValidator = z.enum(["connect", "playCard", "playLastCard"]);

export const messageValidator = z.object({
  event: eventValidator,
});

export type UserMessage = z.infer<typeof messageValidator>;

// Server

export const serverMessageValidator = z.object({
  message: z.string(),
  data: gameValidator.or(z.null()),
});

export type ServerMessage = z.infer<typeof serverMessageValidator>;
