import { type ApiErrorBody, ErrorCode } from '@manhunt/types';

/** Codes produced by the client itself (they never come from the server). */
export const ClientErrorCode = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;

const UNEXPECTED_ERROR = 'Something went wrong';

/**
 * A failed API call. `code` is stable (a server `ErrorCode` or a
 * `ClientErrorCode`) and `message` is ready to show to the user.
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
      typeof b?.message === 'string' ? b.message : UNEXPECTED_ERROR,
      status,
      b?.details,
    );
  }

  static network(): ApiError {
    return new ApiError(
      ClientErrorCode.NETWORK_ERROR,
      "Can't reach the server. Check your connection.",
      0,
    );
  }

  static timeout(): ApiError {
    return new ApiError(
      ClientErrorCode.TIMEOUT,
      'The server is taking too long to respond.',
      0,
    );
  }

  /** When the user is already in another match, that match's id. */
  get openMatchId(): string | null {
    if (this.code !== ErrorCode.ALREADY_IN_MATCH) return null;
    const matchId = (this.details as { matchId?: unknown } | undefined)
      ?.matchId;
    return typeof matchId === 'string' ? matchId : null;
  }
}

/** A user-facing message for any caught error. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return UNEXPECTED_ERROR;
}
