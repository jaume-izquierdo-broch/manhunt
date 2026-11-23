import type { AuthResponse } from '@manhunt/types';
import * as SecureStore from 'expo-secure-store';
import { parseStoredSession, SESSION_KEY } from './stored-session';

/** iOS Keychain / Android Keystore, encrypted. The web build uses session-storage.web.ts. */
export const sessionStorage = {
  load: async (): Promise<AuthResponse | null> =>
    parseStoredSession(await SecureStore.getItemAsync(SESSION_KEY)),
  save: (session: AuthResponse) =>
    SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session)),
  clear: () => SecureStore.deleteItemAsync(SESSION_KEY),
};
