import type { Logger } from '@nestjs/common';
import { type Ack, ErrorCode } from '@manhunt/types';
import { AppError } from '../errors/app-error.js';

/**
 * Ejecuta un handler de WebSocket y convierte el resultado en el ack que espera la app:
 * `{ ok: true, data }` o `{ ok: false, error: { code, message } }`.
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
      error: { code: ErrorCode.INTERNAL_ERROR, message: 'Error interno' },
    };
  }
}
