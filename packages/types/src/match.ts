import { z } from 'zod';
import { MatchStatus, PlayerStatus, Team } from './enums.js';

export const latSchema = z.number().min(-90).max(90);
export const lngSchema = z.number().min(-180).max(180);

/** Zona de juego: de momento un círculo (centro + radio). */
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

export const createMatchSchema = z.object({
  playArea: playAreaSchema,
  hidingSeconds: z
    .number()
    .int()
    .min(MATCH_LIMITS.hidingSeconds.min)
    .max(MATCH_LIMITS.hidingSeconds.max)
    .default(MATCH_LIMITS.hidingSeconds.default),
  durationSeconds: z
    .number()
    .int()
    .min(MATCH_LIMITS.durationSeconds.min)
    .max(MATCH_LIMITS.durationSeconds.max)
    .default(MATCH_LIMITS.durationSeconds.default),
  pingIntervalSeconds: z
    .number()
    .int()
    .min(MATCH_LIMITS.pingIntervalSeconds.min)
    .max(MATCH_LIMITS.pingIntervalSeconds.max)
    .default(MATCH_LIMITS.pingIntervalSeconds.default),
});
export type CreateMatchInput = z.infer<typeof createMatchSchema>;

export const JOIN_CODE_LENGTH = 6;
/** Sin 0/O ni 1/I para que el código se pueda dictar sin confusiones. */
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const joinMatchSchema = z.object({
  joinCode: z
    .string()
    .trim()
    .toUpperCase()
    .length(JOIN_CODE_LENGTH, `El código tiene ${JOIN_CODE_LENGTH} caracteres`),
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
  /** Momento en que el anfitrión pulsó "empezar" (inicio de HIDING). */
  startedAt: string | null;
  /** Fin de la ventaja: empieza la caza (ACTIVE). */
  hidingEndsAt: string | null;
  /** Fin previsto por tiempo: si queda algún escapador, ganan los escapadores. */
  endsAt: string | null;
  /** Fin real de la partida. */
  endedAt: string | null;
  players: PlayerDto[];
}
