import { Mutex } from 'async-mutex'
import { Fold } from 'shared/src/messages/datas/fold'
import { GameUUID } from 'shared/src/messages/datas/game'
import { PartyStatus, PartyUUID } from 'shared/src/messages/datas/party'
import { PlayerUUID } from 'shared/src/messages/datas/player'
import { v4 as uuidv4 } from 'uuid'
import { TeamRow } from './teams'

type PartyRow = {
  gameUUID: GameUUID
  status: PartyStatus
  folds: Array<Fold>
  indexCurrentPlayer: number
}

export type PartyState = { uuid: PartyUUID; row: PartyRow }

type PartiesState = Map<PartyUUID, PartyRow>

export const partiesState: PartiesState = new Map()

const mutex = new Mutex()

export function getPlayers(
  teamA_Row: TeamRow,
  teamB_Row: TeamRow,
): PlayerUUID[] {
  return [
    teamA_Row.player1_UUID,
    teamB_Row.player1_UUID,
    teamA_Row.player2_UUID,
    teamB_Row.player2_UUID,
  ]
}

export function getCurrentPlayer(
  partyRow: PartyRow,
  teamA_Row: TeamRow,
  teamB_Row: TeamRow,
): PlayerUUID {
  const playersOrder = getPlayers(teamA_Row, teamB_Row)
  return playersOrder[partyRow.indexCurrentPlayer]
}

export async function createParty(gameUUID: GameUUID): Promise<PartyState> {
  const release = await mutex.acquire()
  try {
    const partyState: PartyState = {
      uuid: uuidv4() as PartyUUID,
      row: {
        gameUUID: gameUUID,
        status: 'start',
        folds: [],
        indexCurrentPlayer: 0,
      },
    }
    partiesState.set(partyState.uuid, partyState.row)
    return partyState
  } finally {
    release()
  }
}

export async function shiftIndexCurrentPlayer(
  partyUUID: PartyUUID,
): Promise<void> {
  const release = await mutex.acquire()
  try {
    const party = partiesState.get(partyUUID)
    partiesState.set(partyUUID, {
      ...party!,
      indexCurrentPlayer: party!.indexCurrentPlayer + (1 % 4),
    })
  } finally {
    release()
  }
}
