export const Team = {
  HUNTER: 'HUNTER',
  RUNNER: 'RUNNER',
} as const;
export type Team = (typeof Team)[keyof typeof Team];

/**
 * Ciclo de vida de una partida:
 * WAITING (sala) -> HIDING (ventaja de los escapadores) -> ACTIVE (caza) -> FINISHED
 */
export const MatchStatus = {
  WAITING: 'WAITING',
  HIDING: 'HIDING',
  ACTIVE: 'ACTIVE',
  FINISHED: 'FINISHED',
} as const;
export type MatchStatus = (typeof MatchStatus)[keyof typeof MatchStatus];

/** Estados en los que la partida está "en juego" (hay temporizadores corriendo). */
export const LIVE_MATCH_STATUSES = [
  MatchStatus.HIDING,
  MatchStatus.ACTIVE,
] as const;

/** Estados en los que un jugador está "ocupado" y no puede entrar en otra partida. */
export const OPEN_MATCH_STATUSES = [
  MatchStatus.WAITING,
  MatchStatus.HIDING,
  MatchStatus.ACTIVE,
] as const;

export const PlayerStatus = {
  ALIVE: 'ALIVE',
  CAUGHT: 'CAUGHT',
} as const;
export type PlayerStatus = (typeof PlayerStatus)[keyof typeof PlayerStatus];

/** Códigos de error estables que la app puede usar para mostrar mensajes. */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  // Auth
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  // Partidas
  MATCH_NOT_FOUND: 'MATCH_NOT_FOUND',
  ALREADY_IN_MATCH: 'ALREADY_IN_MATCH',
  NOT_IN_MATCH: 'NOT_IN_MATCH',
  NOT_HOST: 'NOT_HOST',
  INVALID_MATCH_STATUS: 'INVALID_MATCH_STATUS',
  MATCH_FULL: 'MATCH_FULL',
  TEAMS_UNBALANCED: 'TEAMS_UNBALANCED',
  HOST_CANNOT_LEAVE: 'HOST_CANNOT_LEAVE',
  // Juego
  NOT_A_HUNTER: 'NOT_A_HUNTER',
  NOT_A_RUNNER: 'NOT_A_RUNNER',
  NOT_ALIVE: 'NOT_ALIVE',
  POSITION_UNKNOWN: 'POSITION_UNKNOWN',
  TOO_FAR: 'TOO_FAR',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
