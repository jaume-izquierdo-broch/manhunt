import { useEffect } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import { create } from 'zustand';
import {
  askForLocation,
  type LocationAccess,
  readLocationAccess,
  turnOnLocationServices,
} from '@/lib/location/device-location';

interface LocationAccessStore {
  /** `null` until it's first read. */
  access: LocationAccess | null;
  refresh: () => Promise<void>;
  /** Does whatever unblocks the location: the system dialog, turning it on, or the settings. */
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

/** Whether positions can be read (an approximate one still counts). */
export const canLocate = (access: LocationAccess | null) =>
  access === 'granted' || access === 'approximate';
