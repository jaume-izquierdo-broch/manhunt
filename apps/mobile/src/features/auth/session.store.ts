import type { AuthResponse, UserDto } from '@manhunt/types';
import { Alert } from 'react-native';
import { create } from 'zustand';
import { configureApiAuth } from '@/lib/http/api-client';
import { queryClient } from '@/lib/query-client';
import { authApi } from './auth.api';
import { sessionStorage } from './session-storage';

/**
 * Who is signed in. Read it from any component with a selector:
 *
 *   const user = useSession((s) => s.user);
 *
 * and call its actions from anywhere, even outside React:
 *
 *   useSession.getState().signOut();
 */
interface SessionStore {
  /** `loading` only while the stored session is read at startup. */
  status: 'loading' | 'signedIn' | 'signedOut';
  token: string | null;
  user: UserDto | null;

  /** Restores the saved session. Call once when the app starts. */
  restore: () => Promise<void>;
  /** After a successful login or sign-up. */
  signIn: (auth: AuthResponse) => Promise<void>;
  /** The user logs out: the session is also revoked on the server. */
  signOut: () => Promise<void>;
  /**
   * The server rejected the token: it expired, or the user logged in on another
   * device (one session per user). Forget it here and say why.
   */
  expire: () => Promise<void>;
}

export const useSession = create<SessionStore>()((set, get) => {
  /** Forgets the session on this device. */
  const clearLocally = async () => {
    set({ status: 'signedOut', token: null, user: null });
    queryClient.clear();
    await sessionStorage.clear();
  };

  return {
    status: 'loading',
    token: null,
    user: null,

    restore: async () => {
      // The HTTP client asks this store for the token and reports 401s back to it.
      configureApiAuth({
        getToken: () => get().token,
        onUnauthorized: () => void get().expire(),
      });

      const stored = await sessionStorage.load();
      if (!stored) {
        set({ status: 'signedOut' });
        return;
      }

      // Sign in right away, even offline; then check the token in the background.
      // A 401 there calls `expire` through the HTTP client.
      set({ status: 'signedIn', token: stored.accessToken, user: stored.user });
      const user = await authApi.me().catch(() => null);
      if (user && get().token === stored.accessToken) set({ user });
    },

    signIn: async (auth) => {
      await sessionStorage.save(auth);
      set({ status: 'signedIn', token: auth.accessToken, user: auth.user });
    },

    signOut: async () => {
      const { token } = get();
      // Revoke it on the server without making the user wait. If that fails
      // (offline), the session simply expires there.
      if (token) void authApi.logout(token).catch(() => {});
      await clearLocally();
    },

    expire: async () => {
      if (get().status !== 'signedIn') return;
      await clearLocally();
      Alert.alert(
        'Session ended',
        'You logged in on another device, or your session expired. Log in again to keep playing.',
      );
    },
  };
});

/** The signed-in user and token. Only for screens inside the `(app)` routes. */
export function useCurrentUser(): { user: UserDto; token: string } {
  const user = useSession((s) => s.user);
  const token = useSession((s) => s.token);
  if (!user || !token) throw new Error('No user is signed in');
  return { user, token };
}
