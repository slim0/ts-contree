import { Mutex } from 'async-mutex'
import { BetScore, Bid, BidUUID } from 'shared/src/messages/datas/bid'
import { Asset, PartyUUID } from 'shared/src/messages/datas/party'
import { PlayerUUID } from 'shared/src/messages/datas/player'
import { v4 as uuidv4 } from 'uuid'

export type BidState = {
  uuid: BidUUID
  row: Bid
}

type BidsState = Map<BidUUID, Bid>

export const bidsState: BidsState = new Map()

const mutex = new Mutex()

export async function createBid(
  partyUUID: PartyUUID,
  playerUUID: PlayerUUID,
  asset: Asset,
  betScore: BetScore,
): Promise<BidState> {
  const release = await mutex.acquire()
  try {
    const uuid = uuidv4() as BidUUID
    const row = {
      uuid,
      partyUUID,
      playerUUID,
      bet: {
        asset,
        betScore,
      },
    }
    bidsState.set(uuid, row)
    return { uuid, row }
  } finally {
    release()
  }
}
