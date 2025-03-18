import { Schema } from "@effect/schema";
import { gameSchema } from "../datas/game";
import { handSchema } from "../datas/hand";
import { playerSchema } from "../datas/player";

// Success

export const pongMessageSchema = Schema.Struct({
  _tag: Schema.tag("PongMessage"),
});

export const playerConnectedMessageSchema = Schema.Struct({
  _tag: Schema.tag("PlayerConnectedMessage"),
  data: playerSchema,
});

export const waitingForGameMessageSchema = Schema.Struct({
  _tag: Schema.tag("WaitingForGameMessage"),
});

export const gameStartedMessageSchema = Schema.Struct({
  _tag: Schema.tag("GameStartedMessage"),
  data: Schema.Struct({
    game: gameSchema,
    hand: handSchema,
  }),
});

export type GameStartedMessage = typeof gameStartedMessageSchema.Type;

const serverReponseMessageSchema = Schema.Union(
  pongMessageSchema,
  waitingForGameMessageSchema,
  gameStartedMessageSchema,
);

export type PongMessage = typeof pongMessageSchema.Type;
export type PlayerConnectedMessage = typeof playerConnectedMessageSchema.Type;
export type WaitingForGameMessage = typeof waitingForGameMessageSchema.Type;
export type ServerMessage = typeof serverReponseMessageSchema.Type;

// Error

export const unparsablePlayerErrorMessageSchema = Schema.Struct({
  _tag: Schema.tag("UnparsablePlayerErrorMessage"),
  message: Schema.String,
});

export const playerStatusErrorMessageSchema = Schema.Struct({
  _tag: Schema.tag("PlayerAlreadyPlayingErrorMessage"),
  message: Schema.String,
});

export const NotManagedErrorMessageSchema = Schema.Struct({
  _tag: Schema.tag("NotManagedErrorMessage"),
  message: Schema.String,
});

export type UnparsablePlayerErrorMessage =
  typeof unparsablePlayerErrorMessageSchema.Type;

export type PlayerStatusErrorMessage =
  typeof playerStatusErrorMessageSchema.Type;

export type NotManagedErrorMessage = typeof NotManagedErrorMessageSchema.Type;

export const serverErrorMessageSchema = Schema.Union(
  NotManagedErrorMessageSchema,
  unparsablePlayerErrorMessageSchema,
  playerStatusErrorMessageSchema,
);

export type ServerErrorMessage = typeof serverErrorMessageSchema.Type;
