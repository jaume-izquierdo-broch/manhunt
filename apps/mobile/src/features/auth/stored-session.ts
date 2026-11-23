import type { AuthResponse } from '@manhunt/types';

export const SESSION_KEY = 'manhunt.session';

/** Lee la sesión guardada; si está corrupta o es de otra versión, la ignora. */
export function parseStoredSession(raw: string | null): AuthResponse | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<AuthResponse>;
    const valid =
      typeof value.accessToken === 'string' &&
      typeof value.user?.id === 'string' &&
      typeof value.user?.username === 'string';
    return valid ? (value as AuthResponse) : null;
  } catch {
    return null;
  }
}
