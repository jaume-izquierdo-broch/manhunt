import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, type TextTone } from './app-text';
import { Icon, type IconName } from './icon';
import { IconBadge } from './icon-badge';
import { SectionTitle } from './section-title';
import { radius, spacing, type ThemeColors } from './theme';
import { useThemeColors } from './use-theme';

/** A titled group of rows on one rounded surface, like the system settings. */
export function ListSection({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  const c = useThemeColors();
  const rows = Children.toArray(children);
  return (
    <View style={styles.section}>
      {title ? <SectionTitle>{title}</SectionTitle> : null}
      <View
        style={[
          styles.group,
          { backgroundColor: c.surface, borderColor: c.border },
        ]}
      >
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 ? (
              <View style={[styles.separator, { backgroundColor: c.border }]} />
            ) : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

export interface ListRowProps {
  label: string;
  /** Shown on the right, e.g. the user's email. */
  value?: string;
  icon?: IconName;
  iconColor?: keyof ThemeColors;
  tone?: TextTone;
  /** Makes the row tappable and shows a chevron. */
  onPress?: () => void;
  accessibilityRole?: 'button' | 'link';
}

export function ListRow({
  label,
  value,
  icon,
  iconColor = 'primary',
  tone = 'default',
  onPress,
  accessibilityRole = 'button',
}: ListRowProps) {
  const content = (
    <>
      {icon ? <IconBadge name={icon} color={iconColor} size={32} /> : null}
      <AppText tone={tone} style={styles.label}>
        {label}
      </AppText>
      {value ? (
        <AppText tone="muted" numberOfLines={1} style={styles.value}>
          {value}
        </AppText>
      ) : null}
      {onPress ? (
        <Icon name="chevron-forward" size={18} color="textMuted" />
      ) : null}
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  group: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  label: { flex: 1 },
  value: { flexShrink: 1, maxWidth: '60%', textAlign: 'right' },
});
