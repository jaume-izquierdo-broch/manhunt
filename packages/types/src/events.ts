import { z } from 'zod';
import type { PlayerStatus, Team } from './enums.js';
import type { ErrorCode } from './errors.js';
import { latSchema, lngSchema, type MatchDto } from './match.js';

/** Socket.IO namespace of the app's single realtime connection. */
export const REALTIME_NAMESPACE = '/realtime';

// ---------------------------------------------------------------------------
// Client -> server payloads (validated by the server with these schemas)
// ---------------------------------------------------------------------------

export const matchSubscribeSchema = z.object({
  matchId: z.uuid(),
});
export type MatchSubscribePayload = z.infer<typeof matchSubscribeSchema>;

/** Stop receiving a match's events (leaving its screen) without closing the socket. */
export const matchUnsubscribeSchema = matchSubscribeSchema;
export type MatchUnsubscribePayload = MatchSubscribePayload;

export const locationUpdateSchema = z.object({
  lat: latSchema,
  lng: lngSchema,
  /** GPS accuracy in meters, as reported by the device. */
  accuracy: z.number().min(0).max(10_000).optional(),
});
export type LocationUpdatePayload = z.infer<typeof locationUpdateSchema>;

export const catchAttemptSchema = z.object({
  runnerId: z.uuid(),
});
export type CatchAttemptPayload = z.infer<typeof catchAttemptSchema>;

// ---------------------------------------------------------------------------
// Server -> client payloads
// ---------------------------------------------------------------------------

export interface PositionDto {
  userId: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  /** When the server received the position. */
  at: string;
}

/** Sent to hunters on every ping: where the free runners are. */
export interface PingRevealPayload {
  matchId: string;
  at: string;
  runners: PositionDto[];
  nextPingAt: string | null;
}

/** Sent to runners on every ping: "the hunters just saw you". */
export interface PingNoticePayload {
  matchId: string;
  at: string;
  nextPingAt: string | null;
}

export interface PlayerCaughtPayload {
  matchId: string;
  runnerId: string;
  hunterId: string;
  at: string;
  runnersRemaining: number;
}

export interface MatchFinishedPayload {
  matchId: string;
  winnerTeam: Team;
  endedAt: string;
}

export interface MatchClosedPayload {
  matchId: string;
}

/**
 * Reply to `match:subscribe`: everything a client needs to render the match.
 * Clients subscribe again after every reconnection to resynchronize.
 */
export interface MatchSnapshot {
  match: MatchDto;
  me: { userId: string; team: Team; status: PlayerStatus };
  /** Latest known positions of your own team. */
  teammates: PositionDto[];
  /** Latest ping (hunters only). */
  lastPing: PingRevealPayload | null;
  nextPingAt: string | null;
  /** Lets clients correct for a phone clock that is off. */
  serverTime: string;
}

export interface CatchResult {
  runnerId: string;
  distanceMeters: number;
  runnersRemaining: number;
}

// ---------------------------------------------------------------------------
// Acknowledgements: every client event is answered with one of these
// ---------------------------------------------------------------------------

export interface WsError {
  code: ErrorCode;
  message: string;
}

export type Ack<T> = { ok: true; data: T } | { ok: false; error: WsError };

// ---------------------------------------------------------------------------
// Typed event maps, shared by the server and socket.io-client
// ---------------------------------------------------------------------------

export interface ClientToServerEvents {
  'match:subscribe': (
    payload: MatchSubscribePayload,
    ack: (res: Ack<MatchSnapshot>) => void,
  ) => void;
  'match:unsubscribe': (
    payload: MatchUnsubscribePayload,
    ack: (res: Ack<null>) => void,
  ) => void;
  'location:update': (
    payload: LocationUpdatePayload,
    ack: (res: Ack<{ at: string }>) => void,
  ) => void;
  'catch:attempt': (
    payload: CatchAttemptPayload,
    ack: (res: Ack<CatchResult>) => void,
  ) => void;
}

export interface ServerToClientEvents {
  /** Any change to the match (players, teams, phase, catches). Full payload. */
  'match:updated': (match: MatchDto) => void;
  /** The host closed the lobby, or you were kicked. */
  'match:closed': (payload: MatchClosedPayload) => void;
  /** Live position of a teammate. */
  'player:position': (payload: PositionDto) => void;
  'ping:reveal': (payload: PingRevealPayload) => void;
  'ping:notice': (payload: PingNoticePayload) => void;
  'player:caught': (payload: PlayerCaughtPayload) => void;
  'match:finished': (payload: MatchFinishedPayload) => void;
}
