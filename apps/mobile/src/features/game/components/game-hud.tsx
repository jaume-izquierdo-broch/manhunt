import { type MatchDto, MatchStatus, Team } from '@manhunt/types';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Card, spacing } from '@/ui';
import { formatCountdown, msUntil, nextPingTime } from '../domain/time';
import { aliveRunners, playersOfTeam } from '../state/game-state';

export interface GameHudProps {
  match: MatchDto;
  myTeam: Team;
  /** Ahora según el reloj del servidor. */
  now: number;
}

/** Cabecera de la partida: fase, cuenta atrás, próximo ping y escapadores libres. */
export function GameHud({ match, myTeam, now }: GameHudProps) {
  const hiding = match.status === MatchStatus.HIDING;
  const remaining = msUntil(hiding ? match.hidingEndsAt : match.endsAt, now);
  const pingAt = nextPingTime(match, now);
  const toPing = pingAt === null ? null : Math.max(0, pingAt - now);
  const runnersTotal = playersOfTeam(match, Team.RUNNER).length;

  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <Badge
          label={myTeam === Team.HUNTER ? 'Cazador' : 'Escapador'}
          tone={myTeam === Team.HUNTER ? 'hunter' : 'runner'}
        />
        <AppText variant="caption" tone="muted">
          {hiding ? 'La caza empieza en' : 'Tiempo restante'}
        </AppText>
      </View>
      <AppText variant="title" accessibilityLabel="Cuenta atrás">
        {remaining === null ? '--:--' : formatCountdown(remaining)}
      </AppText>
      <View style={styles.stats}>
        <AppText variant="caption" tone="muted">
          Escapadores libres: {aliveRunners(match).length}/{runnersTotal}
        </AppText>
        {toPing !== null ? (
          <AppText variant="caption" tone="muted">
            Próximo ping: {formatCountdown(toPing)}
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
