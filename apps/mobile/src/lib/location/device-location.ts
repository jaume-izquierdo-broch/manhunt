import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export type LocationPermission = 'unknown' | 'granted' | 'denied';

export interface DevicePosition {
  lat: number;
  lng: number;
  accuracy: number | null;
  /** Momento de la lectura (ms). */
  at: number;
}

function toDevicePosition(location: Location.LocationObject): DevicePosition {
  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    accuracy: location.coords.accuracy ?? null,
    at: location.timestamp,
  };
}

const toPermission = (
  status: Location.PermissionStatus | string,
): LocationPermission =>
  status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'unknown';

export async function requestLocationPermission(): Promise<LocationPermission> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return toPermission(status);
}

/** Una lectura puntual (p. ej. para fijar el centro de la zona al crear la partida). */
export async function getCurrentPosition(): Promise<DevicePosition> {
  if ((await requestLocationPermission()) !== 'granted') {
    throw new Error(
      'Necesitamos permiso de ubicación para colocar la zona de juego.',
    );
  }
  return toDevicePosition(
    await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    }),
  );
}

/**
 * Permiso y posición del dispositivo en primer plano.
 * Con `watch` activo pide permiso si hace falta y sigue la posición en directo.
 */
export function useDeviceLocation({ watch }: { watch: boolean }) {
  const [permission, setPermission] = useState<LocationPermission>('unknown');
  const [position, setPosition] = useState<DevicePosition | null>(null);

  useEffect(() => {
    let cancelled = false;
    Location.getForegroundPermissionsAsync()
      .then(({ status }) => !cancelled && setPermission(toPermission(status)))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!watch) return;
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const granted = (await requestLocationPermission()) === 'granted';
      if (cancelled) return;
      setPermission(granted ? 'granted' : 'denied');
      if (!granted) return;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2_000,
          distanceInterval: 2,
        },
        (location) => setPosition(toDevicePosition(location)),
      );
      if (cancelled) subscription.remove();
    })().catch(() => !cancelled && setPermission('denied'));

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [watch]);

  const request = async () => setPermission(await requestLocationPermission());

  return { permission, position, requestPermission: request };
}
