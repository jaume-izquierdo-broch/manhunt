import type { AuthResponse, UserDto } from '@manhunt/types';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  type ReactNode,
  use,
  useEffect,
  useRef,
  useState,
} from 'react';
import { configureApiAuth } from '@/lib/http/api-client';
import { authApi } from './auth.api';
import { sessionStorage } from './session-storage';

export type SessionState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; token: string; user: UserDto };

export interface Session {
  state: SessionState;
  /** Tras login o registro correctos. */
  signIn: (auth: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

/**
 * Dueño de la sesión:
 * - Al arrancar carga la sesión guardada y entra directamente (funciona sin red);
 *   después la valida con GET /auth/me en segundo plano.
 * - Da el token al cliente HTTP. Si la API responde 401, cierra la sesión.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    const clear = async () => {
      tokenRef.current = null;
      await sessionStorage.clear();
      queryClient.clear();
      if (active) setState({ status: 'signedOut' });
    };

    configureApiAuth({
      getToken: () => tokenRef.current,
      onUnauthorized: () => void clear(),
    });

    (async () => {
      const stored = await sessionStorage.load();
      if (!active) return;
      if (!stored) {
        setState({ status: 'signedOut' });
        return;
      }

      tokenRef.current = stored.accessToken;
      setState({
        status: 'signedIn',
        token: stored.accessToken,
        user: stored.user,
      });

      // Validación en segundo plano: un 401 dispara onUnauthorized; sin red se sigue.
      const user = await authApi.me().catch(() => null);
      if (active && user && tokenRef.current === stored.accessToken) {
        setState({ status: 'signedIn', token: stored.accessToken, user });
      }
    })();

    return () => {
      active = false;
    };
  }, [queryClient]);

  const signIn = async (auth: AuthResponse) => {
    tokenRef.current = auth.accessToken;
    await sessionStorage.save(auth);
    setState({ status: 'signedIn', token: auth.accessToken, user: auth.user });
  };

  const signOut = async () => {
    tokenRef.current = null;
    await sessionStorage.clear();
    queryClient.clear();
    setState({ status: 'signedOut' });
  };

  return (
    <SessionContext value={{ state, signIn, signOut }}>
      {children}
    </SessionContext>
  );
}

export function useSession(): Session {
  const session = use(SessionContext);
  if (!session)
    throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return session;
}

/** Usuario autenticado. Solo para pantallas protegidas (grupo `(app)`). */
export function useCurrentUser(): { user: UserDto; token: string } {
  const { state } = useSession();
  if (state.status !== 'signedIn') throw new Error('No hay sesión iniciada');
  return { user: state.user, token: state.token };
}
