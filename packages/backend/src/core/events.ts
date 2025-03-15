import { ServerMessage } from 'shared/src/messages/server/serverMessages'
import { GameState } from './database/games'
import { PartyState } from './database/parties'
import { PlayerState } from './database/players'
import { TeamState } from './database/teams'

export type InitializedGame = {
  game: GameState
  teamA: TeamState
  teamB: TeamState
  party: PartyState
  players: PlayerState[]
}

export type ServerResponse = Array<{
  playerState: PlayerState
  data: ServerMessage
}>
