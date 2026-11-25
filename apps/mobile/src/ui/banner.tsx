import { StyleSheet, View } from 'react-native';
import { AppText } from './app-text';
import { radius, spacing } from './theme';
import { useThemeColors } from './use-theme';

export type BannerTone = 'info' | 'warning' | 'danger' | 'success';

/** A highlighted message: errors, match notices... */
export function Banner({
  message,
  tone = 'info',
}: {
  message: string;
  tone?: BannerTone;
}) {
  const c = useThemeColors();
  const color = {
    info: c.textMuted,
    warning: c.warning,
    danger: c.danger,
    success: c.runner,
  }[tone];
  return (
    <View
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      style={[
        styles.banner,
        { borderColor: color, backgroundColor: c.surface },
      ]}
    >
      <View style={[styles.stripe, { backgroundColor: color }]} />
      <AppText variant="label" style={styles.text}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  stripe: { width: 4, alignSelf: 'stretch' },
  text: { flex: 1, padding: spacing.md },
});
