import { z } from "zod";

export const eventValidator = z.enum(["connect", "playCard", "playLastCard"]);

export const messageValidator = z.object({
  event: eventValidator,
});

export type Message = z.infer<typeof messageValidator>;
