import type { MatchDto } from '@manhunt/types';
import { StyleSheet, View } from 'react-native';
import { formatDistance, formatDuration } from '@/lib/format';
import {
  AppText,
  Card,
  IconBadge,
  type IconName,
  spacing,
  type ThemeColors,
} from '@/ui';

interface Rule {
  icon: IconName;
  color: keyof ThemeColors;
  value: string;
  label: string;
}

/** The match settings as a 2×2 grid. */
export function MatchRules({ match }: { match: MatchDto }) {
  const rules: Rule[] = [
    {
      icon: 'locate-outline',
      color: 'primary',
      value: formatDistance(match.playArea.radiusMeters),
      label: 'Area radius',
    },
    {
      icon: 'eye-off-outline',
      color: 'runner',
      value: formatDuration(match.hidingSeconds),
      label: 'To hide',
    },
    {
      icon: 'timer-outline',
      color: 'hunter',
      value: formatDuration(match.durationSeconds),
      label: 'Hunt',
    },
    {
      icon: 'radio-outline',
      color: 'warning',
      value: formatDuration(match.pingIntervalSeconds),
      label: 'Ping every',
    },
  ];

  return (
    <Card style={styles.grid}>
      {rules.map((rule) => (
        <View
          key={rule.label}
          style={styles.rule}
          accessible
          accessibilityLabel={`${rule.label}: ${rule.value}`}
        >
          <IconBadge name={rule.icon} color={rule.color} size={36} />
          <View style={styles.text}>
            <AppText variant="label">{rule.value}</AppText>
            <AppText variant="caption" tone="muted">
              {rule.label}
            </AppText>
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.lg,
    columnGap: spacing.md,
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexBasis: '45%',
    flexGrow: 1,
  },
  text: { flexShrink: 1 },
});
