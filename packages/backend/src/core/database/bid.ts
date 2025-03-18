import { Mutex } from 'async-mutex'
import { BidUUID } from 'shared/src/messages/datas/bid'
import { Asset } from 'shared/src/messages/datas/party'
import { v4 as uuidv4 } from 'uuid'

type BidRow = {
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

export async function createBid(asset: Asset, bet: number): Promise<BidState> {
  const release = await mutex.acquire()
  try {
    const uuid = uuidv4() as BidUUID
    const row = {
      asset: asset,
      bet: bet,
    }
    bidsState.set(uuid, row)
    return { uuid, row }
  } finally {
    release()
  }
}
