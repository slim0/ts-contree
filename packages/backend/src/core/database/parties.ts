import { Schema } from '@effect/schema'
import { Mutex } from 'async-mutex'
import { Color, Fold } from 'shared/src/eventSchemas/datas/cards'
import { PlayerUUID } from 'shared/src/eventSchemas/datas/players'
import { v4 as uuidv4 } from 'uuid'
import { gamesState, GameUUID } from './games'
import { teamsState } from './teams'

export const partyUUIDSchema = Schema.UUID.pipe(Schema.brand('PartyUUID'))
export type PartyUUID = typeof partyUUIDSchema.Type

type PartyStatus = 'start' | 'pending' | 'finish'

type PartyState = {
  gameUUID: GameUUID
  status: PartyStatus
  asset: Color
  folds: Array<Fold>
  indexCurrentPlayer: number
}

type PartiesState = Map<PartyUUID, PartyState>

export const partiesState: PartiesState = new Map()

const mutex = new Mutex()

export function getPlayersOrder(party: PartyState): PlayerUUID[] {
  const game = gamesState.get(party.gameUUID)
  const teamA = teamsState.get(game!.teamA_UUID)
  const teamB = teamsState.get(game!.teamB_UUID)
  return [
    teamA!.player1_UUID,
    teamB!.player1_UUID,
    teamA!.player2_UUID,
    teamB!.player2_UUID,
  ]
}

export function getCurrentPlayer(partyUUID: PartyUUID): PlayerUUID {
  const party = partiesState.get(partyUUID)
  const playersOrder = getPlayersOrder(party!)
  return playersOrder[party!.indexCurrentPlayer]
}

export async function createParty(
  gameUUID: GameUUID,
  asset: Color,
): Promise<void> {
  const release = await mutex.acquire()
  try {
    partiesState.set(uuidv4() as PartyUUID, {
      gameUUID: gameUUID,
      status: 'start',
      asset: asset,
      folds: [],
      indexCurrentPlayer: 0,
    })
  } finally {
    release()
  }
}

export async function shiftIndexCurrentPlayer(
  partyUUID: PartyUUID,
  numberOfPlayer: number,
): Promise<void> {
  const release = await mutex.acquire()
  try {
    const party = partiesState.get(partyUUID)
    partiesState.set(partyUUID, {
      ...party!,
      indexCurrentPlayer: party!.indexCurrentPlayer + (1 % numberOfPlayer),
    })
  } finally {
    release()
  }
}
