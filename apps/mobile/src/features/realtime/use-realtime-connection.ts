import { useEffect } from 'react';
import { AppState } from 'react-native';
import { authApi } from '@/features/auth/auth.api';
import { useCurrentUser, useSession } from '@/features/auth/session.store';
import { type RealtimeStatus, useRealtime } from './realtime.store';
import { createGameSocket, isUnauthorizedConnectError } from './socket';

/**
 * Keeps one socket open for the whole session while the app is in the
 * foreground, so the server can reach the phone at any moment. Mounted by the
 * `(app)` layout, which exists exactly while someone is signed in.
 */
export function useRealtimeConnection() {
  const { token } = useCurrentUser();

  useEffect(() => {
    const socket = createGameSocket(token);
    const setStatus = (status: RealtimeStatus) =>
      useRealtime.setState({ status });

    socket.on('connect', () => setStatus('connected'));

    socket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') return;
      setStatus('reconnecting');
      // The server closed it on purpose: this session ended (logout, or a login
      // on another device). If `me` gets a 401 the session expires; otherwise reconnect.
      if (reason === 'io server disconnect') {
        void authApi
          .me()
          .catch(() => undefined)
          .finally(() => {
            if (useSession.getState().status === 'signedIn') socket.connect();
          });
      }
    });

    socket.on('connect_error', (error) => {
      if (!isUnauthorizedConnectError(error)) return;
      void useSession.getState().expire();
    });

    const connect = () => {
      setStatus('connecting');
      socket.connect();
    };
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !socket.connected) connect();
      if (state === 'background') {
        socket.disconnect();
        setStatus('offline');
      }
    });

    useRealtime.setState({ socket });
    connect();

    return () => {
      appState.remove();
      socket.removeAllListeners();
      socket.disconnect();
      useRealtime.setState({ socket: null, status: 'offline' });
    };
  }, [token]);
}
