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

/** The runner's answer to a catch: whether they were really caught. */
export const catchAnswerSchema = z.object({
  caught: z.boolean(),
});
export type CatchAnswerPayload = z.infer<typeof catchAnswerSchema>;

/**
 * A catch counts once the runner confirms it. If they don't answer in time it
 * counts anyway: the hunter was already checked to be within a few meters.
 */
export const CATCH_CONFIRM_MS = 20_000;

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
  /** Null when the host ended the match early. */
  winnerTeam: Team | null;
  endedAt: string;
}

/** A hunter says they caught a runner; it waits for the runner's answer. */
export interface CatchClaim {
  matchId: string;
  runnerId: string;
  hunterId: string;
  /** Counts as caught after this unless the runner says otherwise. */
  expiresAt: string;
}

/** Sent to the hunter when the runner says they weren't caught. */
export interface CatchRejectedPayload {
  matchId: string;
  runnerId: string;
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
  /** A hunter's catch waiting for my answer (runners only). */
  pendingCatch: CatchClaim | null;
  nextPingAt: string | null;
  /** Lets clients correct for a phone clock that is off. */
  serverTime: string;
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
  /** A hunter claims a catch; the runner has to confirm it. */
  'catch:attempt': (
    payload: CatchAttemptPayload,
    ack: (res: Ack<CatchClaim>) => void,
  ) => void;
  /** The runner answers the catch waiting for them. */
  'catch:answer': (
    payload: CatchAnswerPayload,
    ack: (res: Ack<null>) => void,
  ) => void;
}

export interface ServerToClientEvents {
  /** Any change to the match (players, teams, phase, catches). Full payload. */
  'match:updated': (match: MatchDto) => void;
  /** The host closed the lobby (to everyone but the host), or you were kicked. */
  'match:closed': (payload: MatchClosedPayload) => void;
  /** Live position of a teammate. */
  'player:position': (payload: PositionDto) => void;
  'ping:reveal': (payload: PingRevealPayload) => void;
  'ping:notice': (payload: PingNoticePayload) => void;
  /** To the runner: a hunter says they caught you. */
  'catch:claimed': (payload: CatchClaim) => void;
  /** To the hunter: the runner says they weren't caught. */
  'catch:rejected': (payload: CatchRejectedPayload) => void;
  /** To everyone: a catch was confirmed. */
  'player:caught': (payload: PlayerCaughtPayload) => void;
  'match:finished': (payload: MatchFinishedPayload) => void;
}
