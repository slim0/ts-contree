import { ServerMessage } from 'shared/src/messages/server/serverMessages'
import { GameState } from './database/games'
import { PartyState } from './database/parties'
import { PlayerState } from './database/players'
import { TeamState } from './database/teams'

export type PongEvent = {
  _tag: 'PongEvent'
}

export type WaitingForGameEvent = {
  _tag: 'WaitingForGameEvent'
}

export type GameStartedEventData = {
  game: GameState
  teamA: TeamState
  teamB: TeamState
  party: PartyState
  players: PlayerState[]
}

export type GameStartedEvent = {
  _tag: 'GameStartedEvent'
  data: GameStartedEventData
}

export type ServerEvent = PongEvent | WaitingForGameEvent | GameStartedEvent

export type ServerResponse = Array<{
  playerState: PlayerState
  data: ServerMessage
}>
