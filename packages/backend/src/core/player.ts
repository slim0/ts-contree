import { Schema } from '@effect/schema'
import { Effect, Match, Option, pipe } from 'effect'
import { PlayerStatus, PlayerUUID } from 'shared/src/messages/datas/player'
import {
  BidMessageData,
  PlayerMessage,
  playerMessageSchema,
} from 'shared/src/messages/player/playerMessages'
import {
  GameStartedMessage,
  NewBidMessage,
  NotImplementedErrorMessage,
  NotYourTurnErrorMessage,
  PermissionErrorMessage,
  PlayerStatusErrorMessage,
  PongMessage,
  StateNotFoundErrorMessage,
  UnparsablePlayerErrorMessage,
  WaitingForGameMessage,
} from 'shared/src/messages/server/serverMessages'
import { RawData } from 'ws'
import { createBid } from './database/bid'
import { GameState, getGameStateEffect } from './database/games'
import {
  getCurrentPlayer,
  getPartyStateEffect,
  getPlayers,
  PartyState,
  shiftIndexCurrentPlayer,
} from './database/parties'
import { getStatePlayer, PlayerState } from './database/players'
import { getTeamStateEffect, TeamState } from './database/teams'
import {
  gameStartedResponsesFromInitializedGame,
  searchForNewGame,
} from './game'
import { ServerResponse } from './types'

function verifyPlayerStatus(
  playerState: PlayerState,
  validPlayerStatuses: PlayerStatus[],
): Effect.Effect<void, PlayerStatusErrorMessage> {
  return Match.value(playerState.row.status).pipe(
    Match.whenOr(...validPlayerStatuses, () => Effect.void),
    Match.orElse((status) =>
      Effect.fail({
        _tag: 'PlayerAlreadyPlayingErrorMessage' as const,
        message: `Player with uuid=${playerState.uuid} has status '${status}', which is not in ${validPlayerStatuses}`,
      }),
    ),
  )
}

function retrieveStates(bidMessageData: BidMessageData): Effect.Effect<
  {
    partyState: PartyState
    gameState: GameState
    teamA_State: TeamState
    teamB_State: TeamState
  },
  StateNotFoundErrorMessage
> {
  return pipe(
    Effect.Do,
    Effect.bind('partyState', () =>
      getPartyStateEffect(bidMessageData.partyUUID),
    ),
    Effect.bind('gameState', ({ partyState }) =>
      getGameStateEffect(partyState.row.gameUUID),
    ),
    Effect.bind('teamA_State', ({ gameState }) =>
      getTeamStateEffect(gameState.row.teamA_UUID),
    ),
    Effect.bind('teamB_State', ({ gameState }) =>
      getTeamStateEffect(gameState.row.teamB_UUID),
    ),
    Effect.andThen(({ partyState, gameState, teamA_State, teamB_State }) => ({
      partyState,
      gameState,
      teamA_State,
      teamB_State,
    })),
  )
}

function userBelongsToParty(
  playerUUID: PlayerUUID,
  teamA_State: TeamState,
  teamB_State: TeamState,
): Effect.Effect<void, PermissionErrorMessage> {
  return pipe(
    getPlayers(teamA_State.row, teamB_State.row),
    Effect.andThen((players) =>
      Effect.if(players.includes(playerUUID), {
        onTrue: () => Effect.void,
        onFalse: () =>
          Effect.fail({
            _tag: 'PermissionErrorMessage' as const,
            message: `User with uuid=${playerUUID} do not belongs the team ${teamA_State.uuid} nor ${teamB_State.uuid}}`,
          }),
      }),
    ),
  )
}

const flipTheCoin = Effect.if(1 === 1, {
  onTrue: () => Effect.void, // Runs if the predicate is true
  onFalse: () => Effect.fail(''), // Runs if the predicate is false
})

function userIsTheCurrentPlayer(
  playerUUID: PlayerUUID,
  partyState: PartyState,
  teamA_State: TeamState,
  teamB_State: TeamState,
): Effect.Effect<void, NotYourTurnErrorMessage> {
  return pipe(
    getCurrentPlayer(partyState.row, teamA_State.row, teamB_State.row),
    Effect.andThen((currentPlayerUUID) =>
      Effect.if(currentPlayerUUID === playerUUID, {
        onTrue: () => Effect.void,
        onFalse: () =>
          Effect.fail({
            _tag: 'NotYourTurnErrorMessage' as const,
            message: '',
          }),
      }),
    ),
  )
}

function treatPlayerMessage(
  connectedPlayerState: PlayerState,
  playerEvent: PlayerMessage,
): Effect.Effect<
  | Array<ServerResponse<PongMessage>>
  | Array<ServerResponse<WaitingForGameMessage>>
  | Array<ServerResponse<GameStartedMessage>>
  | Array<ServerResponse<NewBidMessage>>,
  | PlayerStatusErrorMessage
  | NotImplementedErrorMessage
  | PermissionErrorMessage
  | StateNotFoundErrorMessage
  | NotYourTurnErrorMessage
> {
  return pipe(
    Match.type<PlayerMessage>().pipe(
      Match.tag('PingMessage', () =>
        Effect.succeed([
          {
            playerState: connectedPlayerState,
            data: {
              _tag: 'PongMessage' as const,
            },
          },
        ]),
      ),
      Match.tag('PlayGameMessage', () =>
        pipe(
          verifyPlayerStatus(connectedPlayerState, ['connected']),
          Effect.andThen(() => searchForNewGame(connectedPlayerState)),
          Effect.andThen((maybeInitializedGame) =>
            Option.match(maybeInitializedGame, {
              onSome: (initializedGame) =>
                gameStartedResponsesFromInitializedGame(initializedGame),
              onNone: () =>
                Effect.succeed([
                  {
                    playerState: connectedPlayerState,
                    data: {
                      _tag: 'WaitingForGameMessage' as const,
                    },
                  },
                ]),
            }),
          ),
        ),
      ),
      Match.tag('BidMessage', (bidMessage) =>
        pipe(
          Effect.if(bidMessage.data !== null, {
            onTrue: () =>
              pipe(
                Effect.Do,
                Effect.bind('bidMessageData', () =>
                  Effect.succeed(bidMessage.data!),
                ),
                Effect.bind('states', ({ bidMessageData }) =>
                  retrieveStates(bidMessageData),
                ),
                Effect.andThen(({ bidMessageData, states }) =>
                  pipe(
                    Effect.Do,
                    Effect.bind('playerUUIDs', () =>
                      getPlayers(
                        states.teamA_State.row,
                        states.teamB_State.row,
                      ),
                    ),
                    Effect.tap(() =>
                      userBelongsToParty(
                        connectedPlayerState.uuid,
                        states.teamA_State,
                        states.teamB_State,
                      ),
                    ),
                    Effect.tap(() =>
                      userIsTheCurrentPlayer(
                        connectedPlayerState.uuid,
                        states.partyState,
                        states.teamA_State,
                        states.teamB_State,
                      ),
                    ),
                    Effect.bind('bidState', () =>
                      Effect.promise(() =>
                        createBid(
                          states.partyState.uuid,
                          bidMessageData.asset,
                          bidMessageData.betScore,
                        ),
                      ),
                    ),
                    Effect.tap(() =>
                      Effect.promise(() =>
                        shiftIndexCurrentPlayer(states.partyState.uuid),
                      ),
                    ),
                    Effect.andThen(({ playerUUIDs, bidState }) =>
                      pipe(
                        Effect.forEach(playerUUIDs, (playerUUID) =>
                          pipe(
                            Effect.promise(() => getStatePlayer(playerUUID)),
                            Effect.andThen((playerState) => ({
                              playerState: playerState,
                              data: {
                                _tag: 'NewBidMessage' as const,
                                data: {
                                  uuid: bidState.uuid,
                                  partyUUID: states.partyState.uuid,
                                  asset: bidState.row.asset,
                                  betScore: bidState.row.betScore,
                                },
                              },
                            })),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            onFalse: () =>
              Effect.fail({
                _tag: 'NotImplementedErrorMessage' as const,
                message: 'NotImplementedErrorMessage',
              }),
          }),
        ),
      ),
      Match.exhaustive,
    )(playerEvent),
  )
}

function parsePlayerMessage(
  message: RawData,
): Effect.Effect<PlayerMessage, UnparsablePlayerErrorMessage> {
  return pipe(
    Schema.decodeUnknownEither(playerMessageSchema)(
      JSON.parse(message.toString()),
    ),
    Effect.mapError(() => {
      return {
        _tag: 'UnparsablePlayerErrorMessage' as const,
        message: `Unable to parse message from player`,
      }
    }),
  )
}

export function processPlayerMessage(
  message: RawData,
  connectedPlayerState: PlayerState,
): Effect.Effect<
  | Array<ServerResponse<PongMessage>>
  | Array<ServerResponse<WaitingForGameMessage>>
  | Array<ServerResponse<GameStartedMessage>>
  | Array<ServerResponse<NewBidMessage>>,
  | UnparsablePlayerErrorMessage
  | PlayerStatusErrorMessage
  | NotImplementedErrorMessage
  | PermissionErrorMessage
  | StateNotFoundErrorMessage
  | NotYourTurnErrorMessage
> {
  return pipe(
    parsePlayerMessage(message),
    Effect.andThen((parsedMessage) =>
      treatPlayerMessage(connectedPlayerState, parsedMessage),
    ),
  )
}
