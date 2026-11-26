import { StyleSheet, View } from 'react-native';
import { AppText, spacing, useThemeColors } from '@/ui';
import { formatCountdown } from '../rules/time';

/** Shown to hunters during the hiding phase: covers the map until the hunt begins. */
export function HidingOverlay({ remainingMs }: { remainingMs: number | null }) {
  const c = useThemeColors();
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        { backgroundColor: c.overlay },
      ]}
      accessibilityRole="alert"
    >
      <AppText variant="subtitle" tone="onPrimary" center>
        The runners are hiding
      </AppText>
      <AppText variant="title" tone="onPrimary" style={styles.countdown}>
        {remainingMs === null ? '--:--' : formatCountdown(remainingMs)}
      </AppText>
      <AppText tone="onPrimary" center>
        No peeking. The hunt starts when the countdown ends.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  countdown: { fontSize: 56, lineHeight: 64 },
});
