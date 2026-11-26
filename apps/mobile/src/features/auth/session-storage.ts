import type { AuthResponse } from '@manhunt/types';
import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'manhunt.session';

/** The session saved on the phone, encrypted (Keychain / Keystore). */
export const sessionStorage = {
  load: async (): Promise<AuthResponse | null> =>
    parseStoredSession(await SecureStore.getItemAsync(SESSION_KEY)),
  save: (session: AuthResponse) =>
    SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session)),
  clear: () => SecureStore.deleteItemAsync(SESSION_KEY),
};

/** Parses the saved session, ignoring it if it's corrupt or incomplete. */
export function parseStoredSession(raw: string | null): AuthResponse | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<AuthResponse>;
    const valid =
      typeof value.accessToken === 'string' &&
      typeof value.user?.id === 'string' &&
      typeof value.user?.username === 'string' &&
      typeof value.user?.email === 'string';
    return valid ? (value as AuthResponse) : null;
  } catch {
    return null;
  }
}
