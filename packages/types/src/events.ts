import { z } from 'zod';
import type { ErrorCode, PlayerStatus, Team } from './enums.js';
import { latSchema, lngSchema, type MatchDto } from './match.js';

/** Espacio de nombres de Socket.IO para la partida en tiempo real. */
export const GAME_NAMESPACE = '/game';

// ---------------------------------------------------------------------------
// Payloads cliente -> servidor (validados con zod en el servidor)
// ---------------------------------------------------------------------------

export const matchSubscribeSchema = z.object({
  matchId: z.uuid(),
});
export type MatchSubscribePayload = z.infer<typeof matchSubscribeSchema>;

export const locationUpdateSchema = z.object({
  lat: latSchema,
  lng: lngSchema,
  /** Precisión en metros que reporta el GPS del móvil. */
  accuracy: z.number().min(0).max(10_000).optional(),
});
export type LocationUpdatePayload = z.infer<typeof locationUpdateSchema>;

export const catchAttemptSchema = z.object({
  runnerId: z.uuid(),
});
export type CatchAttemptPayload = z.infer<typeof catchAttemptSchema>;

// ---------------------------------------------------------------------------
// Payloads servidor -> cliente
// ---------------------------------------------------------------------------

export interface PositionDto {
  userId: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  /** ISO: cuándo se recibió la posición. */
  at: string;
}

/** Solo lo reciben los cazadores en cada ping. */
export interface PingRevealPayload {
  matchId: string;
  at: string;
  runners: PositionDto[];
  nextPingAt: string | null;
}

/** Lo reciben los escapadores: "os acaban de localizar". */
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

/** Respuesta a `match:subscribe`: todo lo necesario para pintar la pantalla (también al reconectar). */
export interface MatchSnapshot {
  match: MatchDto;
  me: { userId: string; team: Team; status: PlayerStatus };
  /** Posiciones en directo de tu propio equipo. */
  teammates: PositionDto[];
  /** Último ping recibido (solo cazadores). */
  lastPing: PingRevealPayload | null;
  nextPingAt: string | null;
  serverTime: string;
}

export interface CatchResult {
  runnerId: string;
  distanceMeters: number;
  runnersRemaining: number;
}

// ---------------------------------------------------------------------------
// Ack (respuesta a un emit con callback)
// ---------------------------------------------------------------------------

export interface WsError {
  code: ErrorCode;
  message: string;
}

export type Ack<T> = { ok: true; data: T } | { ok: false; error: WsError };

// ---------------------------------------------------------------------------
// Mapas de eventos tipados para Socket.IO (servidor y socket.io-client)
// ---------------------------------------------------------------------------

export interface ClientToServerEvents {
  'match:subscribe': (
    payload: MatchSubscribePayload,
    ack: (res: Ack<MatchSnapshot>) => void,
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
  /** Cualquier cambio de la partida (sala, equipos, fase, capturas). Payload completo. */
  'match:updated': (match: MatchDto) => void;
  /** El anfitrión cerró la sala o te expulsaron. */
  'match:closed': (payload: MatchClosedPayload) => void;
  /** Posición en directo de un compañero de equipo. */
  'player:position': (payload: PositionDto) => void;
  'ping:reveal': (payload: PingRevealPayload) => void;
  'ping:notice': (payload: PingNoticePayload) => void;
  'player:caught': (payload: PlayerCaughtPayload) => void;
  'match:finished': (payload: MatchFinishedPayload) => void;
}
