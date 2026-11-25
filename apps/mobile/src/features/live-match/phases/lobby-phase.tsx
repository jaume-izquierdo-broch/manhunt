import { type MatchDto, Team } from '@manhunt/types';
import { useRouter } from 'expo-router';
import { Alert, Share, StyleSheet, View } from 'react-native';
import { useCurrentUser } from '@/features/auth/session.store';
import {
  useCloseMatch,
  useKickPlayer,
  useLeaveMatch,
  useSetTeam,
  useStartMatch,
} from '@/features/matches/matches.queries';
import { formatDistance, formatDuration } from '@/lib/format';
import { errorMessage } from '@/lib/http/api-error';
import {
  AppText,
  Banner,
  Button,
  Card,
  Screen,
  spacing,
  typography,
} from '@/ui';
import { TeamSection } from '../components/team-section';
import { useLiveMatch, useLoadedMatch } from '../live-match.store';
import { hasBalancedTeams, playersOfTeam } from '../rules/players';

const otherTeam = (team: Team) =>
  team === Team.HUNTER ? Team.RUNNER : Team.HUNTER;

/** The lobby: a code to invite players, the teams and the host's controls. */
export function LobbyPhase() {
  const userId = useCurrentUser().user.id;
  const match = useLoadedMatch();
  const updateMatch = useLiveMatch((s) => s.updateMatch);
  const locationPermission = useLiveMatch((s) => s.locationPermission);
  const requestLocationPermission = useLiveMatch(
    (s) => s.requestLocationPermission,
  );
  const router = useRouter();
  const isHost = match.hostId === userId;
  const balanced = hasBalancedTeams(match);

  const setTeam = useSetTeam(match.id);
  const kick = useKickPlayer(match.id);
  const start = useStartMatch(match.id);
  const leave = useLeaveMatch(match.id);
  const close = useCloseMatch(match.id);

  /** Runs a host action and shows the match it returns right away (the socket confirms it later). */
  const runHostAction = async (
    failureTitle: string,
    action: () => Promise<MatchDto>,
  ) => {
    try {
      updateMatch(await action());
    } catch (error) {
      Alert.alert(failureTitle, errorMessage(error));
    }
  };

  /** Asks for confirmation, runs the action and goes back home. */
  const confirmAndExit = (
    title: string,
    message: string,
    action: () => Promise<unknown>,
  ) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: title,
        style: 'destructive',
        onPress: async () => {
          try {
            await action();
            router.replace('/');
          } catch (error) {
            Alert.alert('Something went wrong', errorMessage(error));
          }
        },
      },
    ]);

  const shareCode = () =>
    Share.share({
      message: `Join my Manhunt match! Code: ${match.joinCode}`,
    });

  const hostFooter = (
    <>
      {!balanced ? (
        <AppText variant="caption" tone="muted" center>
          You need at least one hunter and one runner
        </AppText>
      ) : null}
      <Button
        title="Start match"
        disabled={!balanced}
        loading={start.isPending}
        onPress={() =>
          runHostAction('Could not start the match', () => start.mutateAsync())
        }
      />
      <Button
        title="Close lobby"
        variant="ghost"
        onPress={() =>
          confirmAndExit('Close lobby', 'Every player will be removed.', () =>
            close.mutateAsync(),
          )
        }
      />
    </>
  );

  const guestFooter = (
    <>
      <AppText variant="caption" tone="muted" center>
        Waiting for the host to start the match…
      </AppText>
      <Button
        title="Leave lobby"
        variant="secondary"
        onPress={() =>
          confirmAndExit('Leave', 'Are you sure you want to leave?', () =>
            leave.mutateAsync(),
          )
        }
      />
    </>
  );

  return (
    <Screen scroll footer={isHost ? hostFooter : guestFooter}>
      <Card style={styles.codeCard}>
        <AppText variant="caption" tone="muted">
          Lobby code
        </AppText>
        <AppText
          style={typography.mono}
          accessibilityLabel={`Code ${match.joinCode}`}
          selectable
        >
          {match.joinCode}
        </AppText>
        <Button
          title="Share code"
          variant="secondary"
          compact
          onPress={shareCode}
        />
      </Card>

      <Card>
        <AppText variant="label">Match rules</AppText>
        <View style={styles.rules}>
          <AppText variant="caption">
            {`Play area: ${formatDistance(match.playArea.radiusMeters)} radius`}
          </AppText>
          <AppText variant="caption">
            {`Hiding time: ${formatDuration(match.hidingSeconds)}`}
          </AppText>
          <AppText variant="caption">
            {`Duration: ${formatDuration(match.durationSeconds)}`}
          </AppText>
          <AppText variant="caption">
            {`Hunters get a ping every ${formatDuration(match.pingIntervalSeconds)}`}
          </AppText>
        </View>
      </Card>

      {locationPermission !== 'granted' ? (
        <View style={styles.permission}>
          <Banner
            tone="warning"
            message="You'll need location access to play. Grant it now so you don't lose time when the match starts."
          />
          <Button
            title="Allow location"
            variant="secondary"
            compact
            onPress={requestLocationPermission}
          />
        </View>
      ) : null}

      {[Team.HUNTER, Team.RUNNER].map((team) => (
        <TeamSection
          key={team}
          team={team}
          players={playersOfTeam(match, team)}
          userId={userId}
          hostId={match.hostId}
          onSwitchTeam={
            isHost
              ? (player) =>
                  runHostAction('Could not change the team', () =>
                    setTeam.mutateAsync({
                      userId: player.userId,
                      team: otherTeam(player.team),
                    }),
                  )
              : undefined
          }
          onKick={
            isHost
              ? (player) =>
                  runHostAction('Could not kick the player', () =>
                    kick.mutateAsync(player.userId),
                  )
              : undefined
          }
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  codeCard: { alignItems: 'center' },
  rules: { gap: spacing.xs },
  permission: { gap: spacing.sm },
});
