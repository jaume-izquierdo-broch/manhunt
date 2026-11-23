import type { AuthResponse } from '@manhunt/types';
import { parseStoredSession, SESSION_KEY } from './stored-session';

/** There's no SecureStore on the web: localStorage, for browser testing only. */
export const sessionStorage = {
  load: async (): Promise<AuthResponse | null> =>
    parseStoredSession(globalThis.localStorage?.getItem(SESSION_KEY) ?? null),
  save: async (session: AuthResponse) =>
    globalThis.localStorage?.setItem(SESSION_KEY, JSON.stringify(session)),
  clear: async () => globalThis.localStorage?.removeItem(SESSION_KEY),
};
