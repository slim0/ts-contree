import { Schema } from "@effect/schema";
import { bidSchema } from "../datas/bid";
import { gameSchema } from "../datas/game";
import { handSchema } from "../datas/hand";
import { partySchema } from "../datas/party";
import { playerSchema } from "../datas/player";
import { teamSchema } from "../datas/team";

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

export const pendingGameMessageSchema = Schema.Struct({
  _tag: Schema.tag("PendingGameMessage"),
  data: Schema.Struct({
    game: gameSchema,
    teamA: teamSchema,
    teamB: teamSchema,
    party: partySchema,
    hand: handSchema,
  }),
});

export const newBidMessageSchema = Schema.Struct({
  _tag: Schema.tag("NewBidMessage"),
  data: Schema.Struct({
    bid: Schema.NullOr(bidSchema),
  }),
});

export type PendingGameMessage = typeof pendingGameMessageSchema.Type;

const serverReponseMessageSchema = Schema.Union(
  pongMessageSchema,
  waitingForGameMessageSchema,
  pendingGameMessageSchema,
  newBidMessageSchema,
);

export type PongMessage = typeof pongMessageSchema.Type;
export type PlayerConnectedMessage = typeof playerConnectedMessageSchema.Type;
export type WaitingForGameMessage = typeof waitingForGameMessageSchema.Type;
export type NewBidMessage = typeof newBidMessageSchema.Type;
export type ServerMessage = typeof serverReponseMessageSchema.Type;

// Error

export const unparsablePlayerErrorMessageSchema = Schema.Struct({
  _tag: Schema.tag("UnparsablePlayerErrorMessage"),
  message: Schema.String,
});

export const playerStatusErrorMessageSchema = Schema.Struct({
  _tag: Schema.tag("PlayerStatusErrorMessage"),
  message: Schema.String,
});

export const notImplementedErrorMessageSchema = Schema.Struct({
  _tag: Schema.tag("NotImplementedErrorMessage"),
  message: Schema.String,
});

export const permissionErrorMessageSchema = Schema.Struct({
  _tag: Schema.tag("PermissionErrorMessage"),
  message: Schema.String,
});

export const stateNotFoundErrorMessageSchema = Schema.Struct({
  _tag: Schema.tag("StateNotFoundErrorMessage"),
  message: Schema.String,
});

export const notYourTurnErrorMessageSchema = Schema.Struct({
  _tag: Schema.tag("NotYourTurnErrorMessage"),
  message: Schema.String,
});

export type UnparsablePlayerErrorMessage =
  typeof unparsablePlayerErrorMessageSchema.Type;

export type PlayerStatusErrorMessage =
  typeof playerStatusErrorMessageSchema.Type;

export type NotImplementedErrorMessage =
  typeof notImplementedErrorMessageSchema.Type;

export type PermissionErrorMessage = typeof permissionErrorMessageSchema.Type;

export type StateNotFoundErrorMessage =
  typeof stateNotFoundErrorMessageSchema.Type;

export type NotYourTurnErrorMessage = typeof notYourTurnErrorMessageSchema.Type;

export const serverErrorMessageSchema = Schema.Union(
  notImplementedErrorMessageSchema,
  unparsablePlayerErrorMessageSchema,
  playerStatusErrorMessageSchema,
  permissionErrorMessageSchema,
  stateNotFoundErrorMessageSchema,
  notYourTurnErrorMessageSchema,
);

export type ServerErrorMessage = typeof serverErrorMessageSchema.Type;
