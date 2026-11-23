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
  /** Call after a successful login or sign-up. */
  signIn: (auth: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

/**
 * Owns the user session:
 * - On startup it restores the stored session and signs in right away (works
 *   offline), then validates it in the background with GET /auth/me.
 * - It hands the token to the HTTP client and signs out whenever the API answers 401.
 * - Signing out revokes the session on the server too (best effort: offline, it
 *   simply expires there), without making the user wait for it.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  const tokenRef = useRef<string | null>(null);

  const signOut = async () => {
    const token = tokenRef.current;
    tokenRef.current = null;
    if (token) void authApi.logout(token).catch(() => {});
    await sessionStorage.clear();
    queryClient.clear();
    setState({ status: 'signedOut' });
  };

  const signIn = async (auth: AuthResponse) => {
    tokenRef.current = auth.accessToken;
    await sessionStorage.save(auth);
    setState({ status: 'signedIn', token: auth.accessToken, user: auth.user });
  };

  useEffect(() => {
    let active = true;

    configureApiAuth({
      getToken: () => tokenRef.current,
      onUnauthorized: () => {
        tokenRef.current = null;
        void sessionStorage.clear();
        queryClient.clear();
        if (active) setState({ status: 'signedOut' });
      },
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

      // Background validation: a 401 triggers onUnauthorized; offline, the session stays.
      const user = await authApi.me().catch(() => null);
      if (active && user && tokenRef.current === stored.accessToken) {
        setState({ status: 'signedIn', token: stored.accessToken, user });
      }
    })();

    return () => {
      active = false;
    };
  }, [queryClient]);

  return (
    <SessionContext value={{ state, signIn, signOut }}>
      {children}
    </SessionContext>
  );
}

export function useSession(): Session {
  const session = use(SessionContext);
  if (!session) {
    throw new Error('useSession must be used inside <SessionProvider>');
  }
  return session;
}

/** The signed-in user. Only for protected screens (the `(app)` route group). */
export function useCurrentUser(): { user: UserDto; token: string } {
  const { state } = useSession();
  if (state.status !== 'signedIn') throw new Error('No user is signed in');
  return { user: state.user, token: state.token };
}
