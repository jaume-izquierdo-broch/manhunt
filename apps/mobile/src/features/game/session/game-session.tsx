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
  /** Mi posición (si el GPS está activo). */
  position: DevicePosition | null;
  locationPermission: LocationPermission;
  requestLocationPermission: () => Promise<void>;
  /** Aplica un MatchDto devuelto por una petición REST (sin esperar al socket). */
  applyMatch: (match: MatchDto) => void;
  attemptCatch: (runnerId: string) => Promise<CatchResult>;
}

export const GameSessionContext = createContext<GameSession | null>(null);

/**
 * Conexión en directo con UNA partida, de la sala a los resultados:
 *
 * - Abre el socket, se suscribe (y se re-suscribe tras cada reconexión).
 * - Traduce cada evento del servidor en una acción del reducer.
 * - Activa el GPS y envía la posición mientras la partida está en juego y sigues libre.
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
  // Evento (no dependencia del efecto): cerrar sesión no debe reabrir el socket.
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
        message: 'No se puede conectar con el servidor. Reintentando…',
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

  // --- Ubicación ------------------------------------------------------------
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

  // --- Acciones -------------------------------------------------------------
  const attemptCatch = async (runnerId: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) throw new Error('Sin conexión con el servidor');
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

/** La partida ya cargada (las vistas solo se pintan cuando existe). */
export function useLoadedMatch(): MatchDto {
  const { state } = useGameSession();
  if (!state.match) throw new Error('La partida todavía no se ha cargado');
  return state.match;
}
