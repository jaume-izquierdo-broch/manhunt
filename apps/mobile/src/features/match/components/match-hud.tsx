import { type MatchDto, MatchStatus, Team } from '@manhunt/types';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Card, spacing } from '@/ui';
import { aliveRunners, playersOfTeam } from '../rules/players';
import { formatCountdown, msUntil, nextPingTime } from '../rules/time';

export interface MatchHudProps {
  match: MatchDto;
  myTeam: Team;
  /** "Now" by the server's clock. */
  now: number;
}

/** Match header: phase, countdown, next ping and how many runners are free. */
export function MatchHud({ match, myTeam, now }: MatchHudProps) {
  const hiding = match.status === MatchStatus.HIDING;
  const remaining = msUntil(hiding ? match.hidingEndsAt : match.endsAt, now);
  const pingAt = nextPingTime(match, now);
  const untilPing = pingAt === null ? null : Math.max(0, pingAt - now);
  const runnersTotal = playersOfTeam(match, Team.RUNNER).length;

  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <Badge
          label={myTeam === Team.HUNTER ? 'Hunter' : 'Runner'}
          tone={myTeam === Team.HUNTER ? 'hunter' : 'runner'}
        />
        <AppText variant="caption" tone="muted">
          {hiding ? 'The hunt starts in' : 'Time left'}
        </AppText>
      </View>
      <AppText variant="title" accessibilityLabel="Countdown">
        {remaining === null ? '--:--' : formatCountdown(remaining)}
      </AppText>
      <View style={styles.stats}>
        <AppText variant="caption" tone="muted">
          {`Free runners: ${aliveRunners(match).length}/${runnersTotal}`}
        </AppText>
        {untilPing !== null ? (
          <AppText variant="caption" tone="muted">
            {`Next ping: ${formatCountdown(untilPing)}`}
          </AppText>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs, paddingVertical: spacing.md },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
