import { type PlayerDto, Team } from '@manhunt/types';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Avatar, Badge, spacing } from '@/ui';

export interface PlayerRowProps {
  player: PlayerDto;
  isMe: boolean;
  isHost: boolean;
  /** Buttons on the right (host actions, catch...). */
  actions?: ReactNode;
  /** A line under the name: text, or a component such as the lobby location. */
  detail?: ReactNode;
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
      <View style={caught && styles.faded}>
        <Avatar
          name={player.username}
          size={36}
          color={player.team === Team.HUNTER ? 'hunter' : 'runner'}
        />
      </View>
      <View style={styles.info}>
        <View style={styles.name}>
          <AppText
            variant="label"
            numberOfLines={1}
            style={[styles.username, caught && styles.caught]}
          >
            {player.username}
          </AppText>
          {isMe ? <Badge label="You" tone="accent" /> : null}
          {isHost ? <Badge label="Host" /> : null}
          {caught ? <Badge label="Caught" tone="hunter" /> : null}
        </View>
        {typeof detail === 'string' ? (
          <AppText variant="caption" tone="muted">
            {detail}
          </AppText>
        ) : (
          detail
        )}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
  },
  info: { flex: 1, gap: 2 },
  name: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  username: { flexShrink: 1 },
  caught: { textDecorationLine: 'line-through' },
  faded: { opacity: 0.4 },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
