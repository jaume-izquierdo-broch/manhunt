import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@manhunt/types';
import type { Namespace, Socket } from 'socket.io';
import type { AuthUser } from '../auth/auth.types.js';

/** Data attached to each socket once authenticated. */
export interface SocketData extends AuthUser {
  /** The match the socket subscribed to with `match:subscribe`. */
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
