import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@manhunt/types';
import { AppError } from '../../common/errors/app-error.js';

export const AuthErrors = {
  usernameTaken: () =>
    new AppError(
      ErrorCode.USERNAME_TAKEN,
      'That username is already taken',
      HttpStatus.CONFLICT,
    ),

  emailTaken: () =>
    new AppError(
      ErrorCode.EMAIL_TAKEN,
      'An account with that email already exists',
      HttpStatus.CONFLICT,
    ),

  invalidCredentials: () =>
    new AppError(
      ErrorCode.INVALID_CREDENTIALS,
      'Incorrect username/email or password',
      HttpStatus.UNAUTHORIZED,
    ),

  unauthorized: (message = 'Missing or invalid token') =>
    new AppError(ErrorCode.UNAUTHORIZED, message, HttpStatus.UNAUTHORIZED),
};
