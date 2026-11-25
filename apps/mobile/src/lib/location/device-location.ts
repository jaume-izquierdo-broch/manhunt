// The phone's location (expo-location), behind a few small functions.
import * as Location from 'expo-location';

export type LocationPermission = 'unknown' | 'granted' | 'denied';

export interface DevicePosition {
  lat: number;
  lng: number;
  accuracy: number | null;
  /** When the reading was taken (epoch ms). */
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

const toPermission = (status: string): LocationPermission =>
  status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'unknown';

/** The current permission, without asking the user. */
export async function getLocationPermission(): Promise<LocationPermission> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return toPermission(status);
}

/** Asks the user for permission (only shows a prompt if it wasn't answered yet). */
export async function requestLocationPermission(): Promise<LocationPermission> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return toPermission(status);
}

/** A one-off reading, e.g. to center the play area when creating a match. */
export async function getCurrentPosition(): Promise<DevicePosition> {
  if ((await requestLocationPermission()) !== 'granted') {
    throw new Error('Location permission is needed to place the play area.');
  }
  return toDevicePosition(
    await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    }),
  );
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
