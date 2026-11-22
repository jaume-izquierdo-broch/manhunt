import { HttpStatus } from '@nestjs/common';
import type { ErrorCode } from '@manhunt/types';

/**
 * Error de negocio con un código estable (`ErrorCode`) que la app puede interpretar.
 *
 * - En HTTP, `HttpExceptionFilter` lo convierte en `{ statusCode, code, message, details }`.
 * - En WebSocket, `withAck` lo convierte en `{ ok: false, error: { code, message } }`.
 *
 * No se crean a mano en los servicios: cada módulo tiene su `*.errors.ts`.
 */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: HttpStatus = HttpStatus.BAD_REQUEST,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
