import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@manhunt/types';
import { AppError } from '../../common/errors/app-error.js';

export const LobbyErrors = {
  joinCodeNotFound: () =>
    new AppError(
      ErrorCode.LOBBY_NOT_FOUND,
      'No lobby has that code',
      HttpStatus.NOT_FOUND,
    ),

  notHost: () =>
    new AppError(
      ErrorCode.NOT_HOST,
      'Only the host can do this',
      HttpStatus.FORBIDDEN,
    ),

  full: () =>
    new AppError(
      ErrorCode.LOBBY_FULL,
      'The lobby is full',
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
