import type { MatchDto, MatchSettings } from '@manhunt/types';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  DURATION_OPTIONS,
  HIDING_OPTIONS,
  PING_OPTIONS,
  RADIUS_OPTIONS,
} from '@/features/matches/match-options';
import { formatDistance, formatDuration } from '@/lib/format';
import {
  AppText,
  Card,
  Icon,
  IconBadge,
  type IconName,
  type Option,
  OptionSheet,
  spacing,
  type ThemeColors,
} from '@/ui';

interface Rule {
  key: keyof MatchSettings;
  icon: IconName;
  color: keyof ThemeColors;
  label: string;
  /** Title of the sheet to change it. */
  question: string;
  options: readonly Option<number>[];
  format: (value: number) => string;
}

const RULES: Rule[] = [
  {
    key: 'radiusMeters',
    icon: 'locate-outline',
    color: 'primary',
    label: 'Area radius',
    question: 'Play area radius',
    options: RADIUS_OPTIONS,
    format: formatDistance,
  },
  {
    key: 'hidingSeconds',
    icon: 'eye-off-outline',
    color: 'runner',
    label: 'To hide',
    question: 'Time to hide',
    options: HIDING_OPTIONS,
    format: formatDuration,
  },
  {
    key: 'durationSeconds',
    icon: 'timer-outline',
    color: 'hunter',
    label: 'Hunt',
    question: 'Hunt duration',
    options: DURATION_OPTIONS,
    format: formatDuration,
  },
  {
    key: 'pingIntervalSeconds',
    icon: 'radio-outline',
    color: 'warning',
    label: 'Ping every',
    question: 'Ping the hunters every',
    options: PING_OPTIONS,
    format: formatDuration,
  },
];

/**
 * The match settings as a 2×2 grid. With `onChange` (the host), each rule
 * opens a sheet to pick another value.
 */
export function MatchRules({
  match,
  onChange,
}: {
  match: MatchDto;
  onChange?: (settings: MatchSettings) => void;
}) {
  const [picking, setPicking] = useState<Rule | null>(null);
  const settings: MatchSettings = {
    radiusMeters: match.radiusMeters,
    hidingSeconds: match.hidingSeconds,
    durationSeconds: match.durationSeconds,
    pingIntervalSeconds: match.pingIntervalSeconds,
  };

  return (
    <Card style={styles.grid}>
      {RULES.map((rule) => {
        const value = rule.format(settings[rule.key]);
        const content = (
          <>
            <IconBadge name={rule.icon} color={rule.color} size={36} />
            <View style={styles.text}>
              <View style={styles.value}>
                <AppText variant="label">{value}</AppText>
                {onChange ? (
                  <Icon name="chevron-down" size={14} color="textMuted" />
                ) : null}
              </View>
              <AppText variant="caption" tone="muted">
                {rule.label}
              </AppText>
            </View>
          </>
        );
        return onChange ? (
          <Pressable
            key={rule.key}
            style={({ pressed }) => [styles.rule, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${rule.label}: ${value}`}
            accessibilityHint="Change it"
            onPress={() => setPicking(rule)}
          >
            {content}
          </Pressable>
        ) : (
          <View
            key={rule.key}
            style={styles.rule}
            accessible
            accessibilityLabel={`${rule.label}: ${value}`}
          >
            {content}
          </View>
        );
      })}

      {onChange && picking ? (
        <OptionSheet
          visible
          title={picking.question}
          options={picking.options}
          value={settings[picking.key]}
          onSelect={(value) => onChange({ ...settings, [picking.key]: value })}
          onClose={() => setPicking(null)}
        />
      ) : null}
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
  pressed: { opacity: 0.6 },
  text: { flexShrink: 1 },
  value: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
