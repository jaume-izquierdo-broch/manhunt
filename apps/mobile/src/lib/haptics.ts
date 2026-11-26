import * as Haptics from 'expo-haptics';

/** Vibrations. Silently skipped when the device can't vibrate. */
const vibrate = (type: Haptics.NotificationFeedbackType) => {
  Haptics.notificationAsync(type).catch(() => undefined);
};

export const haptics = {
  /** A value moved one step, like a dial clicking. */
  tick: () => {
    Haptics.selectionAsync().catch(() => undefined);
  },
  /** "The hunters just saw you". */
  warning: () => vibrate(Haptics.NotificationFeedbackType.Warning),
  /** A successful catch. */
  success: () => vibrate(Haptics.NotificationFeedbackType.Success),
  /** You've been caught. */
  error: () => vibrate(Haptics.NotificationFeedbackType.Error),
};
