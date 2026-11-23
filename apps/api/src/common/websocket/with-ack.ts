import type { Logger } from '@nestjs/common';
import { type Ack, ErrorCode } from '@manhunt/types';
import { AppError } from '../errors/app-error.js';

/**
 * Runs a WebSocket handler and wraps its outcome in the acknowledgement clients
 * expect: `{ ok: true, data }` or `{ ok: false, error: { code, message } }`.
 */
export async function withAck<T>(
  logger: Logger,
  handler: () => Promise<T>,
): Promise<Ack<T>> {
  try {
    return { ok: true, data: await handler() };
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, error: { code: error.code, message: error.message } };
    }
    logger.error(error);
    return {
      ok: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Internal server error',
      },
    };
  }
}
