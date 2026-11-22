import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@manhunt/types';
import { AppError } from '../../common/errors/app-error.js';

export const GameErrors = {
  notSubscribed: () =>
    new AppError(
      ErrorCode.NOT_IN_MATCH,
      'Primero suscríbete a la partida con match:subscribe',
    ),

  notPlaying: () =>
    new AppError(
      ErrorCode.INVALID_MATCH_STATUS,
      'La partida no está en juego',
      HttpStatus.CONFLICT,
    ),

  notHuntingPhase: () =>
    new AppError(
      ErrorCode.INVALID_MATCH_STATUS,
      'Solo se puede capturar durante la caza',
      HttpStatus.CONFLICT,
    ),

  youAreCaught: () =>
    new AppError(
      ErrorCode.NOT_ALIVE,
      'Ya has sido capturado',
      HttpStatus.CONFLICT,
    ),

  notHunter: () =>
    new AppError(
      ErrorCode.NOT_A_HUNTER,
      'Solo los cazadores capturan',
      HttpStatus.FORBIDDEN,
    ),

  notRunner: () =>
    new AppError(
      ErrorCode.NOT_A_RUNNER,
      'Ese jugador no es un escapador',
      HttpStatus.NOT_FOUND,
    ),

  runnerAlreadyCaught: () =>
    new AppError(
      ErrorCode.NOT_ALIVE,
      'Ese escapador ya está capturado',
      HttpStatus.CONFLICT,
    ),

  positionUnknown: () =>
    new AppError(
      ErrorCode.POSITION_UNKNOWN,
      'No hay una posición reciente de alguno de los dos',
      HttpStatus.CONFLICT,
    ),

  tooFar: (distanceMeters: number, maxMeters: number) =>
    new AppError(
      ErrorCode.TOO_FAR,
      `Estáis a ${Math.round(distanceMeters)} m (máximo ${maxMeters} m)`,
      HttpStatus.CONFLICT,
      { distanceMeters },
    ),
};
