import { ServerMessage } from 'shared/src/messages/server/serverMessages'
import { PlayerState } from './database/players'

export type ServerResponse<M extends ServerMessage> = {
  playerState: PlayerState
  data: M
}
