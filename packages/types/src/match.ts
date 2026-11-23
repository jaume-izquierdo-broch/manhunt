import { z } from 'zod';
import { MatchStatus, PlayerStatus, Team } from './enums.js';

export const latSchema = z.number().min(-90).max(90);
export const lngSchema = z.number().min(-180).max(180);

/** The play area is a circle: a center point and a radius. */
export const playAreaSchema = z.object({
  lat: latSchema,
  lng: lngSchema,
  radiusMeters: z.number().int().min(50).max(5000),
});
export type PlayArea = z.infer<typeof playAreaSchema>;

export const MATCH_LIMITS = {
  maxPlayers: 30,
  hidingSeconds: { min: 0, max: 1800, default: 120 },
  durationSeconds: { min: 60, max: 4 * 3600, default: 1800 },
  pingIntervalSeconds: { min: 15, max: 1800, default: 120 },
} as const;

const boundedSeconds = (limits: {
  min: number;
  max: number;
  default: number;
}) => z.number().int().min(limits.min).max(limits.max).default(limits.default);

export const createMatchSchema = z.object({
  playArea: playAreaSchema,
  hidingSeconds: boundedSeconds(MATCH_LIMITS.hidingSeconds),
  durationSeconds: boundedSeconds(MATCH_LIMITS.durationSeconds),
  pingIntervalSeconds: boundedSeconds(MATCH_LIMITS.pingIntervalSeconds),
});
export type CreateMatchInput = z.infer<typeof createMatchSchema>;

export const JOIN_CODE_LENGTH = 6;
/** No 0/O or 1/I, so codes can be read out loud without confusion. */
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const joinMatchSchema = z.object({
  joinCode: z
    .string()
    .trim()
    .toUpperCase()
    .length(JOIN_CODE_LENGTH, `The code has ${JOIN_CODE_LENGTH} characters`),
});
export type JoinMatchInput = z.infer<typeof joinMatchSchema>;

export const setTeamSchema = z.object({
  team: z.enum([Team.HUNTER, Team.RUNNER]),
});
export type SetTeamInput = z.infer<typeof setTeamSchema>;

export interface PlayerDto {
  userId: string;
  username: string;
  team: Team;
  status: PlayerStatus;
  caughtBy: string | null;
  caughtAt: string | null;
}

/** All timestamps are ISO 8601 strings. */
export interface MatchDto {
  id: string;
  joinCode: string;
  hostId: string;
  status: MatchStatus;
  playArea: PlayArea;
  hidingSeconds: number;
  durationSeconds: number;
  pingIntervalSeconds: number;
  winnerTeam: Team | null;
  createdAt: string;
  /** When the host started the match (beginning of HIDING). */
  startedAt: string | null;
  /** End of the head start: the hunt (ACTIVE) begins. */
  hidingEndsAt: string | null;
  /** Scheduled end. If any runner is still free by then, runners win. */
  endsAt: string | null;
  /** Actual end of the match. */
  endedAt: string | null;
  players: PlayerDto[];
}
