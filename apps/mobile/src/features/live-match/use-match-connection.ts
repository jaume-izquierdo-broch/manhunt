import { useEffect } from 'react';
import { authApi } from '@/features/auth/auth.api';
import { useCurrentUser, useSession } from '@/features/auth/session.store';
import { useLiveMatch } from './live-match.store';
import {
  createGameSocket,
  emitWithAck,
  isUnauthorizedConnectError,
} from './socket';

/**
 * The live connection to one match, for as long as the match screen is open:
 *
 * - Opens the socket and subscribes to the match (again after every reconnection,
 *   which brings a full snapshot).
 * - Sends every server event to the matching action of the live-match store.
 * - On leaving the screen, closes the socket and empties the store.
 */
export function useMatchConnection(matchId: string) {
  const { token } = useCurrentUser();

  useEffect(() => {
    const store = useLiveMatch.getState();
    const socket = createGameSocket(token);
    store.reset();
    store.setSocket(socket);

    const subscribe = async () => {
      try {
        const snapshot = await emitWithAck(socket, 'match:subscribe', {
          matchId,
        });
        store.loadSnapshot(snapshot, Date.now());
      } catch (error) {
        store.failed((error as Error).message);
      }
    };

    // Connection
    socket.on('connect', () => {
      store.connected();
      void subscribe();
    });
    socket.on('disconnect', (reason) => {
      store.disconnected();
      // The server closed the socket on purpose: usually because this session
      // ended (logged in on another device). Socket.IO won't reconnect by
      // itself in that case. Check the session: a 401 signs out through the
      // HTTP client; if it's still valid, reconnect.
      if (reason === 'io server disconnect') {
        authApi
          .me()
          .then(() => socket.connect())
          .catch(() => undefined);
      }
    });
    socket.on('connect_error', (error) => {
      if (isUnauthorizedConnectError(error)) {
        void useSession.getState().expire();
        return;
      }
      store.failed("Can't reach the server. Retrying…");
    });

    // Match events
    socket.on('match:updated', store.updateMatch);
    socket.on('match:closed', store.matchClosed);
    socket.on('player:position', store.teammateMoved);
    socket.on('ping:reveal', store.pingRevealed);
    socket.on('ping:notice', store.spottedByHunters);
    socket.on('player:caught', store.playerCaught);
    socket.on('match:finished', store.matchFinished);

    store.connecting();
    socket.connect();

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      useLiveMatch.getState().reset();
    };
  }, [matchId, token]);
}
