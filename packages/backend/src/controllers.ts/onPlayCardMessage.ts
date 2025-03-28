import { Effect, pipe } from 'effect'
import { Card } from 'shared/src/messages/datas/cards'
import { Fold } from 'shared/src/messages/datas/fold'
import { PartyStatus } from 'shared/src/messages/datas/party'
import { PlayCardMessage } from 'shared/src/messages/player/playerMessages'
import {
  PartyStatusErrorMessage,
  PendingGameMessage,
  PlayerStatusErrorMessage,
  StateNotFoundErrorMessage,
} from 'shared/src/messages/server/serverMessages'
import {
  PartyState,
  setPartyStatus,
  updatePartyFolds,
} from '../core/database/parties'
import { getStatePlayers, PlayerState } from '../core/database/players'
import { ServerResponse } from '../core/types'
import {
  constructPendingGameMessages,
  retrieveStates,
  verifyPlayerStatus,
} from './common'

function verifyPartyStatus(
  partyState: PartyState,
  validPartyStatuses: PartyStatus[],
): Effect.Effect<void, PartyStatusErrorMessage> {
  return pipe(
    Effect.if(validPartyStatuses.includes(partyState.row.status), {
      onTrue: () => Effect.void,
      onFalse: () =>
        Effect.fail({
          _tag: 'PartyStatusErrorMessage' as const,
          message: `Party with uuid=${partyState.uuid} has status '${partyState.row.status}', which is not in ${validPartyStatuses}`,
        }),
    }),
  )
}

function findIndexCurrentFoldOrCreateNewOne(
  folds: Fold[],
): Effect.Effect<number> {
  return Effect.succeed(folds.findIndex((fold) => fold.cards.length < 4))
}

function addCardToCurrentFold(folds: Fold[], card: Card): Effect.Effect<Fold[]> {
  return pipe(
    findIndexCurrentFoldOrCreateNewOne(folds),
    Effect.andThen((foldIndex) => {
      if (foldIndex === -1) {
        return [
          {
            cards: [card],
            isLastFold: false,
          },
        ]
      } else {
        const foldToUpdate = folds.at(foldIndex)!
        const otherFolds = folds.splice(foldIndex, 1)
        const updatedFold = {
          ...foldToUpdate,
          cards: [...foldToUpdate.cards, card],
        }
        return otherFolds.concat(updatedFold)
      }
    }),
  )
}

export function treatPlayCardMessage(
  playCardMessage: PlayCardMessage,
  connectedPlayerState: PlayerState,
): Effect.Effect<
  Array<ServerResponse<PendingGameMessage>>,
  PlayerStatusErrorMessage | PartyStatusErrorMessage | StateNotFoundErrorMessage
> {
  return pipe(
    Effect.Do,
    Effect.bind('states', () => retrieveStates(playCardMessage.data.partyUUID)),
    Effect.tap(() => verifyPlayerStatus(connectedPlayerState, ['playing'])),
    Effect.tap(({ states }) =>
      verifyPartyStatus(states.partyState, ['playing']),
    ),
    Effect.bind('playerStates', ({ states }) =>
      getStatePlayers(states.teamA_State, states.teamB_State),
    ),
    Effect.bind('updatedPartyState', ({ states }) =>
      pipe(
        Effect.Do,
        Effect.bind('partyWithUpdatedStatus', () =>
          Effect.promise(() => setPartyStatus(states.partyState, 'playing')),
        ),
        Effect.bind('updatedFolds', ({ partyWithUpdatedStatus }) =>
          addCardToCurrentFold(
            [...partyWithUpdatedStatus.row.folds],
            playCardMessage.data.card,
          ),
        ),
        Effect.andThen(({ partyWithUpdatedStatus, updatedFolds }) =>
          Effect.promise(() =>
            updatePartyFolds(partyWithUpdatedStatus, updatedFolds),
          ),
        ),
      ),
    ),
    Effect.andThen(({ states, playerStates, updatedPartyState }) =>
      constructPendingGameMessages(
        states.gameState,
        states.teamA_State,
        states.teamB_State,
        updatedPartyState,
        playerStates,
        [],
      ),
    ),
  )
}
