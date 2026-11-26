import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
  UserDto,
} from '@manhunt/types';
import { Alert } from 'react-native';
import { create } from 'zustand';
import { configureApiAuth } from '@/lib/http/api-client';
import { queryClient } from '@/lib/query-client';
import { authApi } from './auth.api';
import { sessionStorage } from './session-storage';

interface SessionStore {
  status: 'loading' | 'signedIn' | 'signedOut';
  token: string | null;
  user: UserDto | null;

  restore: () => Promise<void>;
  logIn: (values: LoginInput) => Promise<void>;
  register: (values: RegisterInput) => Promise<void>;
  logOut: () => Promise<void>;
  expire: () => Promise<void>;
}

export const useSession = create<SessionStore>()((set, get) => {
  const start = async (auth: AuthResponse) => {
    await sessionStorage.save(auth);
    set({ status: 'signedIn', token: auth.accessToken, user: auth.user });
  };

  const clear = async () => {
    set({ status: 'signedOut', token: null, user: null });
    queryClient.clear();
    await sessionStorage.clear();
  };

  return {
    status: 'loading',
    token: null,
    user: null,

    restore: async () => {
      const stored = await sessionStorage.load();
      if (!stored) {
        set({ status: 'signedOut' });
        return;
      }
      set({ status: 'signedIn', token: stored.accessToken, user: stored.user });
      const user = await authApi.me().catch(() => null);
      if (user && get().token === stored.accessToken) set({ user });
    },

    logIn: async (values) => start(await authApi.login(values)),

    register: async (values) => start(await authApi.register(values)),

    logOut: async () => {
      const { token } = get();
      if (token) void authApi.logout(token).catch(() => {});
      await clear();
    },

    expire: async () => {
      if (get().status !== 'signedIn') return;
      await clear();
      Alert.alert(
        'Session ended',
        'You logged in on another device, or your session expired. Log in again to keep playing.',
      );
    },
  };
});

configureApiAuth({
  getToken: () => useSession.getState().token,
  onUnauthorized: () => void useSession.getState().expire(),
});

/** The signed-in user and token. Only for screens inside the `(app)` routes. */
export function useCurrentUser(): { user: UserDto; token: string } {
  const user = useSession((s) => s.user);
  const token = useSession((s) => s.token);
  if (!user || !token) throw new Error('No user is signed in');
  return { user, token };
}
