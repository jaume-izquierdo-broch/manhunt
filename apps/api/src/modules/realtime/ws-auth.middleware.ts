import { ErrorCode } from '@manhunt/types';
import type { TokenService } from '../auth/token.service.js';
import type { GameSocket } from './realtime.types.js';

type Next = (err?: Error) => void;

/**
 * Middleware del handshake de Socket.IO: sin JWT válido no hay conexión.
 * Acepta `io(url, { auth: { token } })` o la cabecera `Authorization: Bearer`.
 * El cliente recibe `connect_error` con mensaje `UNAUTHORIZED`.
 */
export function createWsAuthMiddleware(tokens: TokenService) {
  return (socket: GameSocket, next: Next) => {
    const auth = socket.handshake.auth as { token?: unknown } | undefined;
    const token =
      auth?.token ??
      socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');

    if (typeof token !== 'string' || !token) {
      next(new Error(ErrorCode.UNAUTHORIZED));
      return;
    }

    tokens
      .verify(token)
      .then((user) => {
        if (!user) return next(new Error(ErrorCode.UNAUTHORIZED));
        socket.data.userId = user.userId;
        socket.data.username = user.username;
        next();
      })
      .catch(() => next(new Error(ErrorCode.UNAUTHORIZED)));
  };
}
