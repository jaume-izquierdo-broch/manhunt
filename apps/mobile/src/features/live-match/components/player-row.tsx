import type { PlayerDto } from '@manhunt/types';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, spacing } from '@/ui';

export interface PlayerRowProps {
  player: PlayerDto;
  isMe: boolean;
  isHost: boolean;
  /** Buttons on the right (host actions, catch...). */
  actions?: ReactNode;
  detail?: string;
}

export function PlayerRow({
  player,
  isMe,
  isHost,
  actions,
  detail,
}: PlayerRowProps) {
  const caught = player.status === 'CAUGHT';
  return (
    <View style={styles.row} accessibilityLabel={`Player ${player.username}`}>
      <View style={styles.info}>
        <View style={styles.name}>
          <AppText variant="label" style={caught && styles.caught}>
            {player.username}
          </AppText>
          {isMe ? <Badge label="You" tone="accent" /> : null}
          {isHost ? <Badge label="Host" /> : null}
          {caught ? <Badge label="Caught" tone="hunter" /> : null}
        </View>
        {detail ? (
          <AppText variant="caption" tone="muted">
            {detail}
          </AppText>
        ) : null}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
  },
  info: { flex: 1, gap: 2 },
  name: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  caught: { textDecorationLine: 'line-through', opacity: 0.6 },
  actions: { flexDirection: 'row', gap: spacing.xs },
});
