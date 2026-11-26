import { ErrorCode } from '@manhunt/types';
import type { SessionStore } from '../auth/session.store.js';
import type { RealtimeSocket } from './realtime.types.js';

type Next = (err?: Error) => void;

/**
 * Socket.IO handshake middleware: no valid session token, no connection.
 * Accepts `io(url, { auth: { token } })` or an `Authorization: Bearer` header.
 * Rejected clients get a `connect_error` whose message is `UNAUTHORIZED`.
 */
export function createWsAuthMiddleware(sessions: SessionStore) {
  return (socket: RealtimeSocket, next: Next) => {
    const auth = socket.handshake.auth as { token?: unknown } | undefined;
    const token =
      auth?.token ??
      socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');

    if (typeof token !== 'string' || !token) {
      next(new Error(ErrorCode.UNAUTHORIZED));
      return;
    }

    sessions
      .verify(token)
      .then((user) => {
        if (!user) return next(new Error(ErrorCode.UNAUTHORIZED));
        socket.data.userId = user.userId;
        socket.data.username = user.username;
        socket.data.sessionId = user.sessionId;
        next();
      })
      .catch(() => next(new Error(ErrorCode.UNAUTHORIZED)));
  };
}
