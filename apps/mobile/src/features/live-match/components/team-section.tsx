import { type PlayerDto, Team } from '@manhunt/types';
import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Card,
  IconBadge,
  IconButton,
  type IconName,
  radius,
  spacing,
  useThemeColors,
} from '@/ui';
import { PlayerRow } from './player-row';

const TEAMS = {
  [Team.HUNTER]: {
    title: 'Hunters',
    icon: 'eye-outline' as IconName,
    color: 'hunter',
    moveTo: 'Move to runners',
  },
  [Team.RUNNER]: {
    title: 'Runners',
    icon: 'footsteps-outline' as IconName,
    color: 'runner',
    moveTo: 'Move to hunters',
  },
} as const;

export interface TeamSectionProps {
  team: Team;
  players: PlayerDto[];
  userId: string;
  hostId: string;
  /** Host-only actions. Without them, the list is read-only. */
  onSwitchTeam?: (player: PlayerDto) => void;
  onKick?: (player: PlayerDto) => void;
}

/** One team in the lobby, with the host's controls next to each player. */
export function TeamSection({
  team,
  players,
  userId,
  hostId,
  onSwitchTeam,
  onKick,
}: TeamSectionProps) {
  const c = useThemeColors();
  const info = TEAMS[team];

  return (
    <Card>
      <View style={styles.header}>
        <IconBadge name={info.icon} color={info.color} size={32} />
        <AppText variant="label" style={styles.title}>
          {info.title}
        </AppText>
        <View style={[styles.count, { backgroundColor: c.surfaceAlt }]}>
          <AppText
            variant="caption"
            tone="muted"
            accessibilityLabel={`${players.length} players`}
          >
            {players.length}
          </AppText>
        </View>
      </View>

      {players.length === 0 ? (
        <View style={[styles.empty, { borderColor: c.border }]}>
          <AppText variant="caption" tone="muted">
            Nobody yet
          </AppText>
        </View>
      ) : null}

      {players.map((player) => (
        <PlayerRow
          key={player.userId}
          player={player}
          isMe={player.userId === userId}
          isHost={player.userId === hostId}
          actions={
            onSwitchTeam || onKick ? (
              <>
                {onSwitchTeam ? (
                  <IconButton
                    icon="swap-horizontal"
                    label={`${info.moveTo}: ${player.username}`}
                    onPress={() => onSwitchTeam(player)}
                  />
                ) : null}
                {onKick && player.userId !== userId ? (
                  <IconButton
                    icon="close"
                    color="danger"
                    label={`Kick ${player.username}`}
                    onPress={() => onKick(player)}
                  />
                ) : null}
              </>
            ) : undefined
          }
        />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { flex: 1, fontSize: 16 },
  count: {
    minWidth: 28,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});
