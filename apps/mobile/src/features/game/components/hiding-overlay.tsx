import { StyleSheet, View } from 'react-native';
import { AppText, spacing, useThemeColors } from '@/ui';
import { formatCountdown } from '../domain/time';

/** Para los cazadores durante el escondite: tapa el mapa hasta que empieza la caza. */
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
        Los escapadores se están escondiendo
      </AppText>
      <AppText variant="title" tone="onPrimary" style={styles.countdown}>
        {remainingMs === null ? '--:--' : formatCountdown(remainingMs)}
      </AppText>
      <AppText tone="onPrimary" center>
        No mires. Cuando acabe la cuenta atrás, empieza la caza.
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
