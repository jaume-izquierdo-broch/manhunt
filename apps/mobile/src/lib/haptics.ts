import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Game vibrations. Silently skipped on web or when the device can't vibrate. */
const vibrate = (type: Haptics.NotificationFeedbackType) => {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(type).catch(() => undefined);
};

export const haptics = {
  /** "The hunters just saw you". */
  warning: () => vibrate(Haptics.NotificationFeedbackType.Warning),
  /** A successful catch. */
  success: () => vibrate(Haptics.NotificationFeedbackType.Success),
  /** You've been caught. */
  error: () => vibrate(Haptics.NotificationFeedbackType.Error),
};
