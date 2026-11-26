import {
  type Ack,
  type ClientToServerEvents,
  ErrorCode,
  GAME_NAMESPACE,
  type ServerToClientEvents,
} from '@manhunt/types';
import { io, type Socket } from 'socket.io-client';
import { getApiBaseUrl } from '@/lib/http/api-client';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

type ClientEvent = keyof ClientToServerEvents;
type Payload<E extends ClientEvent> = Parameters<ClientToServerEvents[E]>[0];
type AckData<E extends ClientEvent> =
  Parameters<Parameters<ClientToServerEvents[E]>[1]>[0] extends Ack<infer T>
    ? T
    : never;

const ACK_TIMEOUT_MS = 8_000;

/** A failed WebSocket action (an `{ ok: false }` ack, or no reply at all). */
export class GameActionError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'GameActionError';
  }
}

/** A socket for the `/game` namespace, not yet connected. It reconnects by itself. */
export function createGameSocket(token: string): GameSocket {
  return io(`${getApiBaseUrl()}${GAME_NAMESPACE}`, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 5_000,
  });
}

/** Emits an event and awaits its ack: returns `data` or throws GameActionError. */
export async function emitWithAck<E extends ClientEvent>(
  socket: GameSocket,
  event: E,
  payload: Payload<E>,
): Promise<AckData<E>> {
  let ack: Ack<AckData<E>>;
  try {
    // socket.io's generics don't cover emitWithAck with a variable event name.
    ack = await (socket.timeout(ACK_TIMEOUT_MS) as any).emitWithAck(
      event,
      payload,
    );
  } catch {
    throw new GameActionError(
      'TIMEOUT',
      'The server is not responding. Try again.',
    );
  }
  if (!ack.ok) throw new GameActionError(ack.error.code, ack.error.message);
  return ack.data;
}

/** The handshake was rejected because the token is invalid (expired session). */
export const isUnauthorizedConnectError = (error: Error) =>
  error.message === ErrorCode.UNAUTHORIZED;
