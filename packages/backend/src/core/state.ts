import { Chunk, Context, Ref } from "effect";
import { Player } from "shared/src/types/players";

// Create a Tag for our state
export class WaitingPlayerState extends Context.Tag("WaitingPlayerState")<
  WaitingPlayerState,
  Ref.Ref<Chunk.Chunk<Player>>
>() {}

export const initialWaitingPlayerState = Ref.make(Chunk.empty<Player>());
