import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { type ApiErrorBody, ErrorCode } from '@manhunt/types';
import type { Response } from 'express';
import { AppError } from './app-error.js';

const STATUS_TO_CODE: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_ERROR,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
};

/** Da a TODOS los errores HTTP la misma forma: `ApiErrorBody`. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    // Los errores de WebSocket los resuelve el gateway con `withAck`.
    if (host.getType() !== 'http') throw exception;

    const body = this.toBody(exception);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(body.statusCode)
      .json(body);
  }

  private toBody(exception: unknown): ApiErrorBody {
    if (exception instanceof AppError) {
      return {
        statusCode: exception.status,
        code: exception.code,
        message: exception.message,
        ...(exception.details !== undefined && { details: exception.details }),
      };
    }

    // Errores propios de Nest (404 de ruta, ParseUUIDPipe, etc.)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : ((response as { message?: string | string[] }).message ??
            exception.message);
      return {
        statusCode: status,
        code: STATUS_TO_CODE[status] ?? `HTTP_${status}`,
        message: Array.isArray(message) ? message.join(', ') : message,
      };
    }

    this.logger.error(exception);
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Error interno',
    };
  }
}
