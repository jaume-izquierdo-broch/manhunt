import { HttpStatus } from '@nestjs/common';
import type { ErrorCode } from '@manhunt/types';

/**
 * A business error with a stable `ErrorCode` that clients can rely on.
 *
 * - Over HTTP, `HttpExceptionFilter` turns it into `{ statusCode, code, message, details }`.
 * - Over WebSocket, `withAck` turns it into `{ ok: false, error: { code, message } }`.
 *
 * Services don't build these by hand: each module defines its errors in `*.errors.ts`.
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
