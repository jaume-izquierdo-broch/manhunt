import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './app-text';
import { Icon, type IconName } from './icon';
import { IconBadge } from './icon-badge';
import { radius, spacing, type ThemeColors } from './theme';
import { useThemeColors } from './use-theme';

export interface ActionCardProps {
  title: string;
  description: string;
  icon: IconName;
  onPress: () => void;
  /** Accent color of the icon (or of the whole card when `prominent`). */
  color?: keyof ThemeColors;
  /** The main action on the screen: filled with the accent color. */
  prominent?: boolean;
  /** Shows a spinner instead of the chevron and ignores taps. */
  busy?: boolean;
}

/** A large tappable card: icon, title, a short description and a chevron. */
export function ActionCard({
  title,
  description,
  icon,
  onPress,
  color = 'primary',
  prominent = false,
  busy = false,
}: ActionCardProps) {
  const c = useThemeColors();
  const onColor = prominent ? 'onPrimary' : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityState={{ busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        prominent
          ? { backgroundColor: c[color], borderColor: c[color] }
          : { backgroundColor: c.surface, borderColor: c.border },
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {prominent ? (
        <View style={styles.iconOnColor}>
          <Icon name={icon} color="onPrimary" size={24} />
        </View>
      ) : (
        <IconBadge name={icon} color={color} size={44} />
      )}
      <View style={styles.text}>
        <AppText
          variant="label"
          tone={onColor ?? 'default'}
          style={styles.title}
        >
          {title}
        </AppText>
        <AppText
          variant="caption"
          tone={onColor ?? 'muted'}
          style={prominent ? styles.softText : undefined}
        >
          {description}
        </AppText>
      </View>
      {busy ? (
        <ActivityIndicator color={prominent ? c.onPrimary : c.textMuted} />
      ) : (
        <Icon name="chevron-forward" size={20} color={onColor ?? 'textMuted'} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconOnColor: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 16 },
  softText: { opacity: 0.85 },
});
