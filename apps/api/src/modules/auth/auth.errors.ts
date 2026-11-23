import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@manhunt/types';
import { AppError } from '../../common/errors/app-error.js';

export const AuthErrors = {
  usernameTaken: () =>
    new AppError(
      ErrorCode.USERNAME_TAKEN,
      'Ese nombre de usuario ya existe',
      HttpStatus.CONFLICT,
    ),

  emailTaken: () =>
    new AppError(
      ErrorCode.EMAIL_TAKEN,
      'Ya existe una cuenta con ese email',
      HttpStatus.CONFLICT,
    ),

  invalidCredentials: () =>
    new AppError(
      ErrorCode.INVALID_CREDENTIALS,
      'Usuario/email o contraseña incorrectos',
      HttpStatus.UNAUTHORIZED,
    ),

  unauthorized: (message = 'Token inválido o ausente') =>
    new AppError(ErrorCode.UNAUTHORIZED, message, HttpStatus.UNAUTHORIZED),
};
