// The phone's location (expo-location), behind a few small functions.
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface DevicePosition {
  lat: number;
  lng: number;
  accuracy: number | null;
  /** When the reading was taken (epoch ms). */
  at: number;
}

/**
 * What the app can do with the location right now, worst case first:
 *
 * - `askable`      not allowed yet, and the system dialog can still be shown.
 * - `blocked`      not allowed, and only the phone's settings can change it.
 * - `servicesOff`  allowed, but the phone's location (GPS) is turned off.
 * - `approximate`  allowed, but only an approximate location (off by up to kilometers).
 * - `granted`      precise location available.
 */
export type LocationAccess =
  'askable' | 'blocked' | 'servicesOff' | 'approximate' | 'granted';

const POSITION_TIMEOUT_MS = 20_000;

/** Reads the permission and the location services, without asking anything. */
export async function readLocationAccess(): Promise<LocationAccess> {
  return toAccess(await Location.getForegroundPermissionsAsync());
}

/** Shows the system dialog if the OS still allows it, and returns the result. */
export async function askForLocation(): Promise<LocationAccess> {
  return toAccess(await Location.requestForegroundPermissionsAsync());
}

/** Android only: the system dialog that turns the location on. */
export function turnOnLocationServices(): Promise<void> {
  return Location.enableNetworkProviderAsync();
}

async function toAccess(
  permission: Location.LocationPermissionResponse,
): Promise<LocationAccess> {
  if (permission.status !== 'granted') {
    return permission.canAskAgain ? 'askable' : 'blocked';
  }
  if (!(await Location.hasServicesEnabledAsync())) return 'servicesOff';
  const approximate =
    Platform.OS === 'ios'
      ? permission.ios?.accuracy === 'reduced'
      : permission.android?.accuracy === 'coarse';
  return approximate ? 'approximate' : 'granted';
}

function toDevicePosition(location: Location.LocationObject): DevicePosition {
  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    accuracy: location.coords.accuracy ?? null,
    at: location.timestamp,
  };
}

/**
 * A one-off reading, e.g. to center the play area. Uses a recent reading if
 * there is one, and gives up after a while (no GPS signal, emulator without a
 * location) instead of waiting forever. Needs the permission already granted.
 */
export async function getCurrentPosition(): Promise<DevicePosition> {
  const recent = await Location.getLastKnownPositionAsync({
    maxAge: 60_000,
    requiredAccuracy: 100,
  });
  if (recent) return toDevicePosition(recent);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(
            "Couldn't get your location. Check that you have GPS signal and try again.",
          ),
        ),
      POSITION_TIMEOUT_MS,
    );
  });
  try {
    const location = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      timeout,
    ]);
    return toDevicePosition(location);
  } finally {
    clearTimeout(timer);
  }
}

/** Calls `onChange` with every new reading. Returns a function that stops watching. */
export async function watchPosition(
  onChange: (position: DevicePosition) => void,
): Promise<() => void> {
  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 2_000,
      distanceInterval: 2,
    },
    (location) => onChange(toDevicePosition(location)),
  );
  return () => subscription.remove();
}
