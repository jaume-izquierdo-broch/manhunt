import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@manhunt/types';
import { AppError } from '../../common/errors/app-error.js';

export const MatchErrors = {
  notFound: () =>
    new AppError(
      ErrorCode.MATCH_NOT_FOUND,
      'Match not found',
      HttpStatus.NOT_FOUND,
    ),

  notInMatch: () =>
    new AppError(
      ErrorCode.NOT_IN_MATCH,
      'You are not in this match',
      HttpStatus.FORBIDDEN,
    ),

  playerNotFound: () =>
    new AppError(
      ErrorCode.NOT_IN_MATCH,
      'That player is not in the match',
      HttpStatus.NOT_FOUND,
    ),

  invalidStatus: (message: string) =>
    new AppError(ErrorCode.INVALID_MATCH_STATUS, message, HttpStatus.CONFLICT),

  alreadyInMatch: (matchId: string) =>
    new AppError(
      ErrorCode.ALREADY_IN_MATCH,
      'You are already in another match',
      HttpStatus.CONFLICT,
      { matchId },
    ),
};
