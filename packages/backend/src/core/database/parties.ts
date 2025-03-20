import { Mutex } from 'async-mutex'
import { Effect, pipe } from 'effect'
import { Fold } from 'shared/src/messages/datas/fold'
import { GameUUID } from 'shared/src/messages/datas/game'
import { PartyStatus, PartyUUID } from 'shared/src/messages/datas/party'
import { PlayerUUID } from 'shared/src/messages/datas/player'
import { StateNotFoundErrorMessage } from 'shared/src/messages/server/serverMessages'
import { v4 as uuidv4 } from 'uuid'
import { TeamRow } from './teams'

type PartyRow = {
  gameUUID: GameUUID
  status: PartyStatus
  folds: Array<Fold>
  indexCurrentPlayer: number
  nullBidInARow: number
}

export type PartyState = { uuid: PartyUUID; row: PartyRow }

type PartiesState = Map<PartyUUID, PartyRow>

export const partiesState: PartiesState = new Map()

const mutex = new Mutex()

export function getPlayers(
  teamA_Row: TeamRow,
  teamB_Row: TeamRow,
): Effect.Effect<PlayerUUID[]> {
  return Effect.succeed([
    teamA_Row.player1_UUID,
    teamB_Row.player1_UUID,
    teamA_Row.player2_UUID,
    teamB_Row.player2_UUID,
  ])
}

async function getpartyState(
  partyUUID: PartyUUID,
  alreadyLock: boolean = false,
): Promise<PartyState | undefined> {
  const release = alreadyLock ? null : await mutex.acquire()
  try {
    const partyState = partiesState.get(partyUUID)
    return partyState && { uuid: partyUUID, row: partyState }
  } finally {
    release && release()
  }
}

export function getPartyStateEffect(
  partyUUID: PartyUUID,
): Effect.Effect<PartyState, StateNotFoundErrorMessage> {
  return pipe(
    Effect.promise(() => getpartyState(partyUUID)),
    Effect.filterOrFail(
      (maybePartyState) => maybePartyState !== undefined,
      () => ({
        _tag: 'StateNotFoundErrorMessage' as const,
        message: `partyState with uuid=${partyUUID} not found`,
      }),
    ),
    Effect.map((partyState) => partyState),
  )
}

export function getCurrentPlayer(
  partyRow: PartyRow,
  teamA_Row: TeamRow,
  teamB_Row: TeamRow,
): Effect.Effect<PlayerUUID> {
  return pipe(
    getPlayers(teamA_Row, teamB_Row),
    Effect.andThen((players) =>
      Effect.succeed(players[partyRow.indexCurrentPlayer]),
    ),
  )
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
        nullBidInARow: 0,
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
      indexCurrentPlayer: (party!.indexCurrentPlayer + 1) % 4,
    })
  } finally {
    release()
  }
}

export async function shiftNullBidInARow(partyUUID: PartyUUID): Promise<void> {
  const release = await mutex.acquire()
  try {
    const party = partiesState.get(partyUUID)
    partiesState.set(partyUUID, {
      ...party!,
      nullBidInARow: party!.nullBidInARow + 1,
    })
  } finally {
    release()
  }
}

export async function resetNullBidInARow(partyUUID: PartyUUID): Promise<void> {
  const release = await mutex.acquire()
  try {
    const party = partiesState.get(partyUUID)
    partiesState.set(partyUUID, {
      ...party!,
      nullBidInARow: 0,
    })
  } finally {
    release()
  }
}
