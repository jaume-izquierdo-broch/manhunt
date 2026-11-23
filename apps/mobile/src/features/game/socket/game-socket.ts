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

/** Error de una acción por WebSocket (ack `{ ok: false }` o sin respuesta). */
export class GameActionError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'GameActionError';
  }
}

/** Socket del namespace `/game`, sin conectar. Reconecta solo si se cae. */
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

/** Emite un evento y espera su ack: devuelve `data` o lanza GameActionError. */
export async function emitWithAck<E extends ClientEvent>(
  socket: GameSocket,
  event: E,
  payload: Payload<E>,
): Promise<AckData<E>> {
  let ack: Ack<AckData<E>>;
  try {
    // Los tipos genéricos de socket.io no cubren bien emitWithAck con eventos variables.
    ack = await (socket.timeout(ACK_TIMEOUT_MS) as any).emitWithAck(
      event,
      payload,
    );
  } catch {
    throw new GameActionError(
      'TIMEOUT',
      'El servidor no responde. Inténtalo de nuevo.',
    );
  }
  if (!ack.ok) throw new GameActionError(ack.error.code, ack.error.message);
  return ack.data;
}

/** El handshake falló por token inválido (la sesión ha caducado). */
export const isUnauthorizedConnectError = (error: Error) =>
  error.message === ErrorCode.UNAUTHORIZED;
