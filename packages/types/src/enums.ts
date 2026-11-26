export const Team = {
  HUNTER: 'HUNTER',
  RUNNER: 'RUNNER',
} as const;
export type Team = (typeof Team)[keyof typeof Team];

/**
 * Match lifecycle:
 * LOBBY (players join, the host sets the rules) -> HIDING (runners' head start) -> ACTIVE (the hunt) -> FINISHED
 */
export const MatchStatus = {
  LOBBY: 'LOBBY',
  HIDING: 'HIDING',
  ACTIVE: 'ACTIVE',
  FINISHED: 'FINISHED',
} as const;
export type MatchStatus = (typeof MatchStatus)[keyof typeof MatchStatus];

/** Statuses in which the match is being played (its timers are running). */
export const LIVE_MATCH_STATUSES = [
  MatchStatus.HIDING,
  MatchStatus.ACTIVE,
] as const;

/** Statuses that keep a player busy: they cannot join another match. */
export const OPEN_MATCH_STATUSES = [
  MatchStatus.LOBBY,
  MatchStatus.HIDING,
  MatchStatus.ACTIVE,
] as const;

export const PlayerStatus = {
  ALIVE: 'ALIVE',
  CAUGHT: 'CAUGHT',
} as const;
export type PlayerStatus = (typeof PlayerStatus)[keyof typeof PlayerStatus];
