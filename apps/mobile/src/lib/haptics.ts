import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Vibraciones de la partida. Silenciosas en web y si el dispositivo no las soporta.
const safe = (fn: () => Promise<void>) => {
  if (Platform.OS === 'web') return;
  fn().catch(() => undefined);
};

export const haptics = {
  /** "Te han localizado". */
  warning: () =>
    safe(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    ),
  /** Captura conseguida / partida ganada. */
  success: () =>
    safe(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    ),
  /** Te han capturado. */
  error: () =>
    safe(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    ),
};
