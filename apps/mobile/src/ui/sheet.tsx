import { type ReactNode, useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './app-text';
import { radius, spacing } from './theme';
import { useThemeColors } from './use-theme';

export interface SheetProps {
  title: string;
  /** Called once the sheet has finished closing, however it was closed. */
  onClose: () => void;
  /** The content. `close` slides the sheet away, like tapping outside. */
  children: (close: () => void) => ReactNode;
}

/** Further than any sheet is tall, so it starts below the screen. */
const HIDDEN_OFFSET = 600;

/**
 * A sheet that rises from the bottom. It's open while it's rendered: the
 * backdrop fades in and the sheet slides up; tapping outside, the back button
 * or `close` take it away the same way.
 */
export function Sheet({ title, onClose, children }: SheetProps) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  // 0 = hidden, 1 = shown. Drives both the backdrop and the sheet.
  const [shown] = useState(() => new Animated.Value(0));
  const [slide] = useState(() =>
    shown.interpolate({
      inputRange: [0, 1],
      outputRange: [HIDDEN_OFFSET, 0],
    }),
  );

  useEffect(() => {
    Animated.timing(shown, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [shown]);

  // Closing twice restarts the animation; only the one that finishes counts.
  const close = () => {
    Animated.timing(shown, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => finished && onClose());
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={close}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: c.overlay, opacity: shown },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityLabel="Close"
          onPress={close}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: c.surface,
            borderColor: c.border,
            paddingBottom: insets.bottom + spacing.lg,
            transform: [{ translateY: slide }],
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: c.border }]} />
        <AppText variant="subtitle" accessibilityRole="header">
          {title}
        </AppText>
        {children(close)}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.pill,
  },
});
