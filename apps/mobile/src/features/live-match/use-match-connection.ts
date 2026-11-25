import { type CatchResult, type MatchDto, PlayerStatus } from '@manhunt/types';
import {
  createContext,
  type ReactNode,
  use,
  useEffect,
  useEffectEvent,
  useReducer,
  useRef,
} from 'react';
import { useCurrentUser, useSession } from '@/features/auth/session-provider';
import { haptics } from '@/lib/haptics';
import {
  type DevicePosition,
  type LocationPermission,
  useDeviceLocation,
} from '@/lib/location/device-location';
import { useLocationReporter } from '../hooks/use-location-reporter';
import {
  createGameSocket,
  emitWithAck,
  type GameSocket,
  isUnauthorizedConnectError,
} from '../socket/game-socket';
import {
  gameReducer,
  type GameState,
  initialGameState,
  isLive,
} from '../state/game-state';

export interface GameSession {
  state: GameState;
  userId: string;
  /** My position, while GPS tracking is on. */
  position: DevicePosition | null;
  locationPermission: LocationPermission;
  requestLocationPermission: () => Promise<void>;
  /** Applies a MatchDto returned by a REST call, without waiting for the socket. */
  applyMatch: (match: MatchDto) => void;
  attemptCatch: (runnerId: string) => Promise<CatchResult>;
}

export const GameSessionContext = createContext<GameSession | null>(null);

/**
 * The live connection to ONE match, from the lobby to the results:
 *
 * - Opens the socket and subscribes (again after every reconnection).
 * - Turns every server event into a reducer action.
 * - Tracks GPS and reports the position while the match is live and you're free.
 */
export function GameSessionProvider({
  matchId,
  children,
}: {
  matchId: string;
  children: ReactNode;
}) {
  const { user, token } = useCurrentUser();
  const { signOut } = useSession();
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const socketRef = useRef<GameSocket | null>(null);
  const userId = user.id;
  // An effect event, not a dependency: signing out must not reopen the socket.
  const onUnauthorized = useEffectEvent(() => void signOut());

  // --- Socket ---------------------------------------------------------------
  useEffect(() => {
    const socket = createGameSocket(token);
    socketRef.current = socket;

    const subscribe = async () => {
      try {
        const snapshot = await emitWithAck(socket, 'match:subscribe', {
          matchId,
        });
        dispatch({ type: 'snapshot', snapshot, receivedAt: Date.now() });
      } catch (error) {
        dispatch({ type: 'failed', message: (error as Error).message });
      }
    };

    socket.on('connect', () => {
      dispatch({ type: 'connected' });
      void subscribe();
    });
    socket.on('disconnect', () => dispatch({ type: 'disconnected' }));
    socket.on('connect_error', (error) => {
      if (isUnauthorizedConnectError(error)) {
        onUnauthorized();
        return;
      }
      dispatch({
        type: 'failed',
        message: "Can't reach the server. Retrying…",
      });
    });

    socket.on('match:updated', (match) =>
      dispatch({ type: 'matchUpdated', match }),
    );
    socket.on('match:closed', () => dispatch({ type: 'matchClosed' }));
    socket.on('player:position', (position) =>
      dispatch({ type: 'position', position }),
    );
    socket.on('ping:reveal', (ping) => dispatch({ type: 'pingReveal', ping }));
    socket.on('ping:notice', (notice) => {
      haptics.warning();
      dispatch({ type: 'pingNotice', notice });
    });
    socket.on('player:caught', (caught) => {
      if (caught.runnerId === userId) haptics.error();
      dispatch({ type: 'playerCaught', caught });
    });
    socket.on('match:finished', (finished) =>
      dispatch({ type: 'matchFinished', finished }),
    );

    dispatch({ type: 'connecting' });
    socket.connect();

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [matchId, token, userId]);

  // --- Location -------------------------------------------------------------
  const tracking =
    isLive(state.match?.status) && state.me?.status === PlayerStatus.ALIVE;
  const location = useDeviceLocation({ watch: tracking });

  useLocationReporter({
    enabled: tracking && state.connection === 'connected',
    position: location.position,
    report: async (p) => {
      const socket = socketRef.current;
      if (!socket) return;
      await emitWithAck(socket, 'location:update', {
        lat: p.lat,
        lng: p.lng,
        ...(p.accuracy !== null && { accuracy: p.accuracy }),
      });
    },
  });

  // --- Actions --------------------------------------------------------------
  const attemptCatch = async (runnerId: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) throw new Error('Not connected to the server');
    const result = await emitWithAck(socket, 'catch:attempt', { runnerId });
    haptics.success();
    return result;
  };

  const value: GameSession = {
    state,
    userId,
    position: location.position,
    locationPermission: location.permission,
    requestLocationPermission: location.requestPermission,
    applyMatch: (match) => dispatch({ type: 'matchUpdated', match }),
    attemptCatch,
  };

  return <GameSessionContext value={value}>{children}</GameSessionContext>;
}

export function useGameSession(): GameSession {
  const session = use(GameSessionContext);
  if (!session)
    throw new Error(
      'useGameSession debe usarse dentro de <GameSessionProvider>',
    );
  return session;
}

/** The loaded match (views only render once it exists). */
export function useLoadedMatch(): MatchDto {
  const { state } = useGameSession();
  if (!state.match) throw new Error('The match has not loaded yet');
  return state.match;
}
