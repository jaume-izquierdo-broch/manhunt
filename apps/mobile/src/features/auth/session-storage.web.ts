import type { AuthResponse } from '@manhunt/types';
import { parseStoredSession, SESSION_KEY } from './stored-session';

// En web no hay SecureStore: localStorage (solo para probar en el navegador).
export const sessionStorage = {
  load: async (): Promise<AuthResponse | null> =>
    parseStoredSession(globalThis.localStorage?.getItem(SESSION_KEY) ?? null),
  save: async (session: AuthResponse) =>
    globalThis.localStorage?.setItem(SESSION_KEY, JSON.stringify(session)),
  clear: async () => globalThis.localStorage?.removeItem(SESSION_KEY),
};
