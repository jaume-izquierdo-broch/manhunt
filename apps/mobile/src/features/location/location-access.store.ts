import { useEffect } from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';
import { create } from 'zustand';
import {
  askForLocation,
  type LocationAccess,
  readLocationAccess,
  turnOnLocationServices,
} from '@/lib/location/device-location';

interface LocationAccessStore {
  access: LocationAccess | null;
  refresh: () => Promise<void>;
  fix: () => Promise<void>;
}

export const useLocationAccessStore = create<LocationAccessStore>()(
  (set, get) => ({
    access: null,

    refresh: async () => {
      const access = await readLocationAccess().catch(() => get().access);
      set({ access });
    },

    fix: async () => {
      const android = Platform.OS === 'android';
      switch (get().access) {
        case null:
        case 'askable':
          set({ access: await askForLocation() });
          return;
        case 'approximate':
          if (android) set({ access: await askForLocation() });
          else await Linking.openSettings();
          return;
        case 'servicesOff':
          if (android) {
            await turnOnLocationServices().catch(() => undefined);
            await get().refresh();
          } else {
            await Linking.openSettings();
          }
          return;
        case 'blocked':
          await Linking.openSettings();
          return;
        case 'granted':
          return;
      }
    },
  }),
);

// Coming back to the app (from its settings, for instance) reads it again.
AppState.addEventListener('change', (state) => {
  if (state === 'active') void useLocationAccessStore.getState().refresh();
});

/** The location access, read when the component mounts and whenever the app comes back. */
export function useLocationAccess(): LocationAccess | null {
  const access = useLocationAccessStore((s) => s.access);
  useEffect(() => {
    void useLocationAccessStore.getState().refresh();
  }, []);
  return access;
}

const readAccess = async () => {
  await useLocationAccessStore.getState().refresh();
  return useLocationAccessStore.getState().access;
};

/** On opening the app: the system dialog, if it can still be shown. Refusing it blocks nothing yet. */
export async function offerLocation(): Promise<void> {
  if ((await readAccess()) === 'askable') {
    await useLocationAccessStore.getState().fix();
  }
}

/** Only the phone's settings can fix it: the app can't show a dialog for it. */
const onlySettingsCanFix = (access: LocationAccess | null) =>
  access === 'blocked' ||
  (Platform.OS !== 'android' &&
    (access === 'servicesOff' || access === 'approximate'));

/**
 * Before entering a match: whether the precise location is on. If not, it
 * shows the dialog that fixes it and checks again; when only the settings can,
 * it says so and offers to open them.
 */
export async function ensurePreciseLocation(): Promise<boolean> {
  const access = await readAccess();
  if (access === 'granted') return true;

  if (onlySettingsCanFix(access)) {
    Alert.alert(
      'Location needed',
      'Manhunt needs your precise location to play. You can turn it on in Settings.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open settings', onPress: () => void Linking.openSettings() },
      ],
    );
    return false;
  }

  await useLocationAccessStore.getState().fix();
  return useLocationAccessStore.getState().access === 'granted';
}

/** Whether positions can be read (an approximate one still counts). */
export const canLocate = (access: LocationAccess | null) =>
  access === 'granted' || access === 'approximate';
