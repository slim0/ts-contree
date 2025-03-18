import { Mutex } from 'async-mutex'
import { BidUUID } from 'shared/src/messages/datas/bid'
import { Asset, PartyUUID } from 'shared/src/messages/datas/party'
import { v4 as uuidv4 } from 'uuid'

type BidRow = {
  partyUUID: PartyUUID
  asset: Asset
  bet: number
}

export type BidState = {
  uuid: BidUUID
  row: BidRow
}

type BidsState = Map<BidUUID, BidRow>

export const bidsState: BidsState = new Map()

const mutex = new Mutex()

export async function createBid(
  partyUUID: PartyUUID,
  asset: Asset,
  bet: number,
): Promise<BidState> {
  const release = await mutex.acquire()
  try {
    const uuid = uuidv4() as BidUUID
    const row = {
      partyUUID: partyUUID,
      asset: asset,
      bet: bet,
    }
    bidsState.set(uuid, row)
    return { uuid, row }
  } finally {
    release()
  }
}
