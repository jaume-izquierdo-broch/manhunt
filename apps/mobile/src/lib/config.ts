import Constants from 'expo-constants';
import { Platform } from 'react-native';

export interface ApiUrlSources {
  /** EXPO_PUBLIC_API_URL: si existe, manda. */
  envUrl?: string;
  /** Puerto de la API en el ordenador de desarrollo. */
  port: number;
  /** `host:puerto` del servidor de Metro (p. ej. "192.168.1.20:8081"). */
  hostUri?: string | null;
  platform: typeof Platform.OS;
}

/**
 * Decide a qué URL llama la app:
 *
 * 1. `EXPO_PUBLIC_API_URL` si está definida (túnel, API desplegada...).
 * 2. En desarrollo, la IP del ordenador que sirve Metro: así un móvil real en la
 *    misma Wi-Fi llega a la API sin configurar nada.
 * 3. Emulador Android -> 10.0.2.2 (el localhost del ordenador); resto -> localhost.
 */
export function resolveApiUrl({
  envUrl,
  port,
  hostUri,
  platform,
}: ApiUrlSources): string {
  if (envUrl?.trim()) return envUrl.trim().replace(/\/+$/, '');

  const host = hostUri?.split(':')[0];
  if (host && !host.endsWith('.exp.direct')) return `http://${host}:${port}`;

  return platform === 'android'
    ? `http://10.0.2.2:${port}`
    : `http://localhost:${port}`;
}

export const API_URL = resolveApiUrl({
  envUrl: process.env.EXPO_PUBLIC_API_URL,
  port: Number(process.env.EXPO_PUBLIC_API_PORT ?? 3000),
  hostUri: Constants.expoConfig?.hostUri,
  platform: Platform.OS,
});
