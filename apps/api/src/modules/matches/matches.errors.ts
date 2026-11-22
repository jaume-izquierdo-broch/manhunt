import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@manhunt/types';
import { AppError } from '../../common/errors/app-error.js';

export const MatchErrors = {
  notFound: () =>
    new AppError(
      ErrorCode.MATCH_NOT_FOUND,
      'La partida no existe',
      HttpStatus.NOT_FOUND,
    ),

  joinCodeNotFound: () =>
    new AppError(
      ErrorCode.MATCH_NOT_FOUND,
      'No hay ninguna partida con ese código',
      HttpStatus.NOT_FOUND,
    ),

  notInMatch: () =>
    new AppError(
      ErrorCode.NOT_IN_MATCH,
      'No participas en esta partida',
      HttpStatus.FORBIDDEN,
    ),

  playerNotFound: () =>
    new AppError(
      ErrorCode.NOT_IN_MATCH,
      'Ese jugador no está en la partida',
      HttpStatus.NOT_FOUND,
    ),

  notHost: () =>
    new AppError(
      ErrorCode.NOT_HOST,
      'Solo el anfitrión puede hacer esto',
      HttpStatus.FORBIDDEN,
    ),

  invalidStatus: (message: string) =>
    new AppError(ErrorCode.INVALID_MATCH_STATUS, message, HttpStatus.CONFLICT),

  alreadyInMatch: (matchId: string) =>
    new AppError(
      ErrorCode.ALREADY_IN_MATCH,
      'Ya estás en otra partida',
      HttpStatus.CONFLICT,
      { matchId },
    ),

  full: () =>
    new AppError(
      ErrorCode.MATCH_FULL,
      'La partida está llena',
      HttpStatus.CONFLICT,
    ),

  teamsUnbalanced: () =>
    new AppError(
      ErrorCode.TEAMS_UNBALANCED,
      'Hace falta al menos un cazador y un escapador',
      HttpStatus.CONFLICT,
    ),

  hostCannotLeave: () =>
    new AppError(
      ErrorCode.HOST_CANNOT_LEAVE,
      'El anfitrión no puede salir: cierra la partida',
      HttpStatus.CONFLICT,
    ),

  cannotKickHost: () =>
    new AppError(
      ErrorCode.HOST_CANNOT_LEAVE,
      'No puedes expulsarte a ti mismo',
      HttpStatus.CONFLICT,
    ),
};
