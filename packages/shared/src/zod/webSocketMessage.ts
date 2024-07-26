import { z } from "zod";

// Client
export const eventValidator = z.enum(["connect", "playCard", "playLastCard"]);

export const messageValidator = z.object({
  event: eventValidator,
});

export type UserMessage = z.infer<typeof messageValidator>;

// Server

export const serverMessageValidator = z.object({
  message: z.string(),
});

export type ServerMessage = z.infer<typeof serverMessageValidator>;
