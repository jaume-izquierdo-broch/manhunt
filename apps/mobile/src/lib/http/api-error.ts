import { type ApiErrorBody, ErrorCode } from '@manhunt/types';

/** Códigos que solo genera el cliente (no vienen del servidor). */
export const ClientErrorCode = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;

/**
 * Error de una llamada a la API. `code` es estable (ErrorCode del servidor o
 * ClientErrorCode) y `message` ya viene en español listo para mostrar.
 */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromBody(status: number, body: unknown): ApiError {
    const b = body as Partial<ApiErrorBody> | undefined;
    return new ApiError(
      typeof b?.code === 'string' ? b.code : `HTTP_${status}`,
      typeof b?.message === 'string'
        ? b.message
        : 'Ha ocurrido un error inesperado',
      status,
      b?.details,
    );
  }

  static network(): ApiError {
    return new ApiError(
      ClientErrorCode.NETWORK_ERROR,
      'No se pudo conectar con el servidor. Revisa tu conexión.',
      0,
    );
  }

  static timeout(): ApiError {
    return new ApiError(
      ClientErrorCode.TIMEOUT,
      'El servidor tarda demasiado en responder.',
      0,
    );
  }

  /** Si el usuario ya está en otra partida, el id de esa partida. */
  get openMatchId(): string | null {
    if (this.code !== ErrorCode.ALREADY_IN_MATCH) return null;
    const matchId = (this.details as { matchId?: unknown } | undefined)
      ?.matchId;
    return typeof matchId === 'string' ? matchId : null;
  }
}

/** Mensaje mostrable para cualquier error capturado. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Ha ocurrido un error inesperado';
}
