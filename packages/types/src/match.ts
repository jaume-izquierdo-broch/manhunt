import { z } from 'zod';
import { MatchStatus, PlayerStatus, Team } from './enums.js';

export const latSchema = z.number().min(-90).max(90);
export const lngSchema = z.number().min(-180).max(180);

/** The play area is a circle: a center point and a radius. */
export interface PlayArea {
  lat: number;
  lng: number;
  radiusMeters: number;
}

/**
 * What the server accepts. The app offers a realistic part of these ranges;
 * the rest is for tests and the simulator, which need matches of seconds.
 *
 * The defaults are one coherent match on foot: a 600 m radius, 3 min to hide,
 * and a 1 h hunt with a ping as it begins and every 3 min after.
 */
export const MATCH_LIMITS = {
  maxPlayers: 30,
  radiusMeters: { min: 50, max: 10_000, default: 600 },
  hidingSeconds: { min: 0, max: 3600, default: 180 },
  durationSeconds: { min: 60, max: 4 * 3600, default: 3600 },
  pingIntervalSeconds: { min: 15, max: 1800, default: 180 },
  /** Fewer pings and the hunters have nothing to go on. */
  minPings: 3,
} as const;

/** How many pings fire during the hunt: one as it begins, then one every interval before the end. */
export function pingsDuringHunt(
  durationSeconds: number,
  pingIntervalSeconds: number,
): number {
  return Math.ceil(durationSeconds / pingIntervalSeconds);
}

const bounded = (limits: { min: number; max: number; default: number }) =>
  z.number().int().min(limits.min).max(limits.max).default(limits.default);

/** What the host can change in the lobby. Missing fields take the defaults. */
export const matchSettingsSchema = z
  .object({
    radiusMeters: bounded(MATCH_LIMITS.radiusMeters),
    hidingSeconds: bounded(MATCH_LIMITS.hidingSeconds),
    durationSeconds: bounded(MATCH_LIMITS.durationSeconds),
    pingIntervalSeconds: bounded(MATCH_LIMITS.pingIntervalSeconds),
  })
  .refine(
    (s) =>
      pingsDuringHunt(s.durationSeconds, s.pingIntervalSeconds) >=
      MATCH_LIMITS.minPings,
    {
      path: ['pingIntervalSeconds'],
      message: `The hunt needs at least ${MATCH_LIMITS.minPings} pings`,
    },
  );
export type MatchSettings = z.output<typeof matchSettingsSchema>;

/** The host's position when starting: it becomes the center of the play area. */
export const startMatchSchema = z.object({
  lat: latSchema,
  lng: lngSchema,
  accuracy: z.number().min(0).max(10_000).optional(),
});
export type StartMatchInput = z.infer<typeof startMatchSchema>;

/** Every player shares their location from the lobby, so the host knows who is ready. */
export const LOBBY_LOCATION = {
  reportEveryMs: 10_000,
  /** Older than this, the player counts as having no location. */
  staleAfterMs: 45_000,
  /** The host's GPS must be at least this precise to center the area. */
  maxHostAccuracyMeters: 100,
  /** GPS error forgiven when checking that a player is inside the area. */
  maxAccuracyAllowanceMeters: 50,
} as const;

export const JOIN_CODE_LENGTH = 6;
/** No 0/O or 1/I, so codes can be read out loud without confusion. */
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const joinLobbySchema = z.object({
  joinCode: z
    .string()
    .trim()
    .toUpperCase()
    .length(JOIN_CODE_LENGTH, `The code has ${JOIN_CODE_LENGTH} characters`),
});
export type JoinLobbyInput = z.infer<typeof joinLobbySchema>;

export const setTeamSchema = z.object({
  team: z.enum([Team.HUNTER, Team.RUNNER]),
});
export type SetTeamInput = z.infer<typeof setTeamSchema>;

/** A player's latest location in the lobby, compared with the host's. */
export interface LobbyLocationDto {
  /** Null for the host, or while the host has no location. */
  distanceFromHostMeters: number | null;
  accuracy: number | null;
  /** When the server received it. */
  at: string;
}

export interface PlayerDto {
  userId: string;
  username: string;
  team: Team;
  status: PlayerStatus;
  caughtBy: string | null;
  caughtAt: string | null;
  /** Only in the lobby; null if the player hasn't shared a location. */
  lobbyLocation: LobbyLocationDto | null;
}

export type LobbyReadiness = 'ready' | 'far' | 'noLocation';

/** Whether a player can start the match from where they are. */
export function lobbyReadiness(
  location: LobbyLocationDto | null,
  radiusMeters: number,
  now: Date,
): LobbyReadiness {
  if (!location) return 'noLocation';
  if (now.getTime() - Date.parse(location.at) > LOBBY_LOCATION.staleAfterMs) {
    return 'noLocation';
  }
  if (location.distanceFromHostMeters === null) return 'ready';
  const allowance = Math.min(
    location.accuracy ?? 0,
    LOBBY_LOCATION.maxAccuracyAllowanceMeters,
  );
  return location.distanceFromHostMeters - allowance > radiusMeters
    ? 'far'
    : 'ready';
}

/** All timestamps are ISO 8601 strings. */
export interface MatchDto {
  id: string;
  joinCode: string;
  hostId: string;
  status: MatchStatus;
  radiusMeters: number;
  /** Centered on the host when the match starts; null in the lobby. */
  playArea: PlayArea | null;
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
