import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@manhunt/types';
import type { Namespace, Socket } from 'socket.io';
import type { AuthUser } from '../auth/auth.types.js';

/** Datos guardados en cada socket tras autenticarse. */
export interface SocketData extends AuthUser {
  /** Partida a la que está suscrito (tras `match:subscribe`). */
  matchId?: string;
}

type InterServerEvents = Record<string, never>;

export type GameNamespace = Namespace<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type GameSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
