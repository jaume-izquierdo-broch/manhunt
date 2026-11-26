/** Stable error codes. Clients branch on these, never on the message text. */
export const ErrorCode = {
  // Generic
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  // Auth
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  // Any match
  MATCH_NOT_FOUND: 'MATCH_NOT_FOUND',
  NOT_IN_MATCH: 'NOT_IN_MATCH',
  ALREADY_IN_MATCH: 'ALREADY_IN_MATCH',
  INVALID_MATCH_STATUS: 'INVALID_MATCH_STATUS',
  // Lobby
  LOBBY_NOT_FOUND: 'LOBBY_NOT_FOUND',
  LOBBY_FULL: 'LOBBY_FULL',
  NOT_HOST: 'NOT_HOST',
  HOST_CANNOT_LEAVE: 'HOST_CANNOT_LEAVE',
  TEAMS_UNBALANCED: 'TEAMS_UNBALANCED',
  PLAYERS_NOT_READY: 'PLAYERS_NOT_READY',
  LOCATION_INACCURATE: 'LOCATION_INACCURATE',
  // Live match
  NOT_A_HUNTER: 'NOT_A_HUNTER',
  NOT_A_RUNNER: 'NOT_A_RUNNER',
  NOT_ALIVE: 'NOT_ALIVE',
  POSITION_UNKNOWN: 'POSITION_UNKNOWN',
  TOO_FAR: 'TOO_FAR',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Body of every HTTP error response. */
export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  /** Extra data, e.g. per-field validation issues `[{ path, message }]`. */
  details?: unknown;
}
