import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@manhunt/types';
import { AppError } from '../../common/errors/app-error.js';
import {
  describePlayersNotReady,
  type PlayerNotReady,
} from './domain/start-rules.js';

export const GameErrors = {
  notSubscribed: () =>
    new AppError(
      ErrorCode.NOT_IN_MATCH,
      'Subscribe to the match first (match:subscribe)',
    ),

  notPlaying: () =>
    new AppError(
      ErrorCode.INVALID_MATCH_STATUS,
      'The match is not being played',
      HttpStatus.CONFLICT,
    ),

  notHuntingPhase: () =>
    new AppError(
      ErrorCode.INVALID_MATCH_STATUS,
      'Catches are only allowed during the hunt',
      HttpStatus.CONFLICT,
    ),

  youAreCaught: () =>
    new AppError(
      ErrorCode.NOT_ALIVE,
      'You have already been caught',
      HttpStatus.CONFLICT,
    ),

  notHunter: () =>
    new AppError(
      ErrorCode.NOT_A_HUNTER,
      'Only hunters can catch',
      HttpStatus.FORBIDDEN,
    ),

  notRunner: () =>
    new AppError(
      ErrorCode.NOT_A_RUNNER,
      'That player is not a runner',
      HttpStatus.NOT_FOUND,
    ),

  runnerAlreadyCaught: () =>
    new AppError(
      ErrorCode.NOT_ALIVE,
      'That runner has already been caught',
      HttpStatus.CONFLICT,
    ),

  positionUnknown: () =>
    new AppError(
      ErrorCode.POSITION_UNKNOWN,
      'There is no recent position for one of you',
      HttpStatus.CONFLICT,
    ),

  tooFar: (distanceMeters: number, maxMeters: number) =>
    new AppError(
      ErrorCode.TOO_FAR,
      `You are ${Math.round(distanceMeters)} m apart (max ${maxMeters} m)`,
      HttpStatus.CONFLICT,
      { distanceMeters },
    ),

  playersNotReady: (players: PlayerNotReady[]) =>
    new AppError(
      ErrorCode.PLAYERS_NOT_READY,
      `Not everyone is in the play area: ${describePlayersNotReady(players)}`,
      HttpStatus.CONFLICT,
      { players },
    ),

  hostLocationInaccurate: () =>
    new AppError(
      ErrorCode.LOCATION_INACCURATE,
      'Your location is not precise enough yet. Wait a moment, ideally outdoors.',
      HttpStatus.CONFLICT,
    ),
};
