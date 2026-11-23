import Constants from 'expo-constants';
import { Platform } from 'react-native';

export interface ApiUrlSources {
  /** EXPO_PUBLIC_API_URL. When set, it always wins. */
  envUrl?: string;
  /** API port on the development machine. */
  port: number;
  /** `host:port` of the Metro dev server (e.g. "192.168.1.20:8081"). */
  hostUri?: string | null;
  platform: typeof Platform.OS;
}

/**
 * Decides which URL the app calls:
 *
 * 1. `EXPO_PUBLIC_API_URL`, if set (tunnels, a deployed API...).
 * 2. In development, the IP of the machine serving Metro, so a real phone on
 *    the same Wi-Fi reaches the API with zero configuration.
 * 3. Android emulator -> 10.0.2.2 (the host machine's localhost); otherwise localhost.
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
