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

  joinCodeNotFound: () =>
    new AppError(
      ErrorCode.MATCH_NOT_FOUND,
      'No match has that code',
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

  notHost: () =>
    new AppError(
      ErrorCode.NOT_HOST,
      'Only the host can do this',
      HttpStatus.FORBIDDEN,
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

  full: () =>
    new AppError(
      ErrorCode.MATCH_FULL,
      'The match is full',
      HttpStatus.CONFLICT,
    ),

  teamsUnbalanced: () =>
    new AppError(
      ErrorCode.TEAMS_UNBALANCED,
      'You need at least one hunter and one runner',
      HttpStatus.CONFLICT,
    ),

  hostCannotLeave: () =>
    new AppError(
      ErrorCode.HOST_CANNOT_LEAVE,
      'The host cannot leave: close the lobby instead',
      HttpStatus.CONFLICT,
    ),

  cannotKickHost: () =>
    new AppError(
      ErrorCode.HOST_CANNOT_LEAVE,
      'The host cannot kick themselves',
      HttpStatus.CONFLICT,
    ),
};
