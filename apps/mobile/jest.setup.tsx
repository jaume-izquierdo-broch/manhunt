// Sustitutos de módulos nativos que no existen en el entorno de tests.

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

jest.mock('expo-location', () => ({
  Accuracy: { High: 4, Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
  })),
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { latitude: 41.387, longitude: 2.17, accuracy: 5 },
    timestamp: Date.now(),
  })),
  watchPositionAsync: jest.fn(async () => ({ remove: jest.fn() })),
}));

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

jest.mock('react-native-maps', () => {
  const { View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  const Stub = (props: object) => <View {...props} />;
  return { __esModule: true, default: Stub, Marker: Stub, Circle: Stub };
});
