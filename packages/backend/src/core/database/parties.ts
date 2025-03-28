import { Mutex } from 'async-mutex'
import { Effect, pipe } from 'effect'
import { Fold } from 'shared/src/messages/datas/fold'
import { GameUUID } from 'shared/src/messages/datas/game'
import { Party, PartyStatus, PartyUUID } from 'shared/src/messages/datas/party'
import { PlayerUUID } from 'shared/src/messages/datas/player'
import { Team } from 'shared/src/messages/datas/team'
import { StateNotFoundErrorMessage } from 'shared/src/messages/server/serverMessages'
import { v4 as uuidv4 } from 'uuid'

export type PartyState = { uuid: PartyUUID; row: Party }

type PartiesState = Map<PartyUUID, Party>

export const partiesState: PartiesState = new Map()

const mutex = new Mutex()

export function getPlayers(
  teamA: Team,
  teamB: Team,
): Effect.Effect<PlayerUUID[]> {
  return Effect.succeed([
    teamA.player1_UUID,
    teamB.player1_UUID,
    teamA.player2_UUID,
    teamB.player2_UUID,
  ])
}

export async function getPartyState(
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

export async function setPartyStatus(
  partyState: PartyState,
  partyStatus: PartyStatus,
  alreadyLock: boolean = false,
): Promise<PartyState> {
  const release = alreadyLock ? null : await mutex.acquire()
  try {
    const updatedParty = {
      ...partyState.row,
      status: partyStatus,
    }
    partiesState.set(partyState.uuid, updatedParty)
    return { uuid: partyState.uuid, row: updatedParty }
  } finally {
    release && release()
  }
}

export async function updatePartyFolds(
  partyState: PartyState,
  folds: Fold[],
  alreadyLock: boolean = false,
): Promise<PartyState> {
  const release = alreadyLock ? null : await mutex.acquire()
  try {
    const fold = partyState.row.folds.at(-1)
    const updatedParty = {
      ...partyState.row,
      folds: folds
    }
    partiesState.set(partyState.uuid, updatedParty)
    return { uuid: partyState.uuid, row: updatedParty }
  } finally {
    release && release()
  }
}

export function getPartyStateEffect(
  partyUUID: PartyUUID,
): Effect.Effect<PartyState, StateNotFoundErrorMessage> {
  return pipe(
    Effect.promise(() => getPartyState(partyUUID)),
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
  party: Party,
  teamA: Team,
  teamB: Team,
): Effect.Effect<PlayerUUID> {
  return pipe(
    getPlayers(teamA, teamB),
    Effect.andThen((players) =>
      Effect.succeed(players[party.indexCurrentPlayer]),
    ),
  )
}

export async function deleteParty(partyUUID: PartyUUID): Promise<void> {
  const release = await mutex.acquire()
  try {
    partiesState.delete(partyUUID)
  } finally {
    release()
  }
}

export async function createParty(gameUUID: GameUUID): Promise<PartyState> {
  const release = await mutex.acquire()
  try {
    const uuid = uuidv4() as PartyUUID
    const partyState: PartyState = {
      uuid,
      row: {
        uuid,
        gameUUID: gameUUID,
        status: 'bids',
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
): Promise<number> {
  const release = await mutex.acquire()
  try {
    const party = partiesState.get(partyUUID)
    const newIndex = (party!.indexCurrentPlayer + 1) % 4
    partiesState.set(partyUUID, {
      ...party!,
      indexCurrentPlayer: newIndex,
    })
    return newIndex
  } finally {
    release()
  }
}

export async function shiftNullBidInARow(
  partyUUID: PartyUUID,
): Promise<number> {
  const release = await mutex.acquire()
  try {
    const party = partiesState.get(partyUUID)
    const nullBidInARow = party!.nullBidInARow + 1
    partiesState.set(partyUUID, {
      ...party!,
      nullBidInARow: nullBidInARow,
    })
    return nullBidInARow
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
