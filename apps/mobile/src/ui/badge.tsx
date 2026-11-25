import { StyleSheet, View } from 'react-native';
import { AppText } from './app-text';
import { radius, spacing } from './theme';
import { useThemeColors } from './use-theme';

export type BadgeTone = 'neutral' | 'hunter' | 'runner' | 'accent' | 'warning';

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: BadgeTone;
}) {
  const c = useThemeColors();
  const background = {
    neutral: c.surfaceAlt,
    hunter: c.hunter,
    runner: c.runner,
    accent: c.primary,
    warning: c.warning,
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <AppText
        variant="caption"
        tone={tone === 'neutral' ? 'muted' : 'onPrimary'}
        // Yellow is too light for white text.
        style={[styles.text, tone === 'warning' && { color: c.background }]}
      >
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  text: { fontWeight: '700' },
});
