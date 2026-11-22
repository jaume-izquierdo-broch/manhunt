import {
  type Ack,
  type ClientToServerEvents,
  GAME_NAMESPACE,
  type ServerToClientEvents,
} from '@manhunt/types';
import { io, type Socket } from 'socket.io-client';

export type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

type ServerEvent = keyof ServerToClientEvents;
type ServerPayload<E extends ServerEvent> = Parameters<
  ServerToClientEvents[E]
>[0];

type ClientEvent = keyof ClientToServerEvents;
type ClientPayload<E extends ClientEvent> = Parameters<
  ClientToServerEvents[E]
>[0];
type AckData<E extends ClientEvent> =
  Parameters<Parameters<ClientToServerEvents[E]>[1]>[0] extends Ack<infer T>
    ? T
    : never;

/** Conecta al namespace `/game` igual que lo hará la app. */
export async function connectSocket(
  baseUrl: string,
  token: string,
): Promise<ClientSocket> {
  const socket: ClientSocket = io(`${baseUrl}${GAME_NAMESPACE}`, {
    auth: { token },
    transports: ['websocket'],
    reconnection: false,
  });
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve());
    socket.once('connect_error', (err) => {
      socket.disconnect();
      reject(err);
    });
  });
  return socket;
}

/** Emite un evento y espera el ack tipado. */
export function emit<E extends ClientEvent>(
  socket: ClientSocket,
  event: E,
  payload: ClientPayload<E>,
): Promise<Ack<AckData<E>>> {
  return (socket.timeout(10_000) as any).emitWithAck(event, payload);
}

/** Espera al primer evento del servidor que cumpla `predicate`. */
export function waitFor<E extends ServerEvent>(
  socket: ClientSocket,
  event: E,
  predicate: (payload: ServerPayload<E>) => boolean = () => true,
  timeoutMs = 10_000,
): Promise<ServerPayload<E>> {
  return new Promise((resolve, reject) => {
    const listener = (payload: ServerPayload<E>) => {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, listener as never);
      resolve(payload);
    };
    const timer = setTimeout(() => {
      socket.off(event, listener as never);
      reject(new Error(`Timeout esperando "${event}"`));
    }, timeoutMs);
    socket.on(event, listener as never);
  });
}
