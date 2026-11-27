import type { MatchDto, MatchSettings } from '@manhunt/types';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { SettingKey } from '../match-settings';
import { RuleSheet } from './rule-sheet';
import { formatDistance, formatDuration } from '@/lib/format';
import {
  AppText,
  Card,
  Icon,
  IconBadge,
  type IconName,
  spacing,
  type ThemeColors,
} from '@/ui';

interface Rule {
  key: SettingKey;
  icon: IconName;
  color: keyof ThemeColors;
  label: string;
  question: string;
  format: (value: number) => string;
}

const RULES: Rule[] = [
  {
    key: 'radiusMeters',
    icon: 'locate-outline',
    color: 'primary',
    label: 'Area radius',
    question: 'Play area radius',
    format: formatDistance,
  },
  {
    key: 'hidingSeconds',
    icon: 'eye-off-outline',
    color: 'runner',
    label: 'To hide',
    question: 'Time to hide',
    format: formatDuration,
  },
  {
    key: 'durationSeconds',
    icon: 'timer-outline',
    color: 'hunter',
    label: 'Hunt',
    question: 'Hunt duration',
    format: formatDuration,
  },
  {
    key: 'pingIntervalSeconds',
    icon: 'radio-outline',
    color: 'warning',
    label: 'Ping every',
    question: 'Ping the hunters every',
    format: formatDuration,
  },
];

/**
 * The match settings as a 2×2 grid. With `onChange` (the host), each rule
 * opens a sheet to change it.
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
        <RuleSheet
          title={picking.question}
          setting={picking.key}
          format={picking.format}
          settings={settings}
          onChange={onChange}
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
