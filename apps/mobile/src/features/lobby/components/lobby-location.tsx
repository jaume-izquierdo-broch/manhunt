import type { MatchDto, PlayerDto } from '@manhunt/types';
import { StyleSheet, View } from 'react-native';
import { formatDistance } from '@/lib/format';
import {
  AppText,
  Icon,
  type IconName,
  spacing,
  type TextTone,
  type ThemeColors,
} from '@/ui';
import { readinessOf } from '../readiness';

interface Look {
  icon: IconName;
  color: keyof ThemeColors;
  tone: TextTone;
  text: string;
}

/** Under each player in the lobby: whether they can start from where they are. */
export function LobbyLocation({
  match,
  player,
  now,
}: {
  match: MatchDto;
  player: PlayerDto;
  now: number;
}) {
  const distance = player.lobbyLocation?.distanceFromHostMeters ?? null;
  const look: Look = {
    ready: {
      icon: 'checkmark-circle' as const,
      color: 'runner' as const,
      tone: 'runner' as const,
      text:
        distance === null
          ? 'Location ready'
          : `Ready · ${formatDistance(distance)} from the host`,
    },
    far: {
      icon: 'warning' as const,
      color: 'warning' as const,
      tone: 'warning' as const,
      text: `${formatDistance(distance ?? 0)} away · outside the area`,
    },
    noLocation: {
      icon: 'location-outline' as const,
      color: 'textMuted' as const,
      tone: 'muted' as const,
      text: 'No location yet',
    },
  }[readinessOf(match, player, now)];

  return (
    <View style={styles.row}>
      <Icon name={look.icon} size={14} color={look.color} />
      <AppText variant="caption" tone={look.tone}>
        {look.text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
