import { type MatchDto, Team } from '@manhunt/types';
import { useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import { useCurrentUser } from '@/features/auth/session.store';
import { LocationAccessNotice } from '@/features/location/location-access-notice';
import {
  useCloseMatch,
  useKickPlayer,
  useLeaveMatch,
  useSetTeam,
  useStartMatch,
} from '@/features/matches/matches.queries';
import { errorMessage } from '@/lib/http/api-error';
import { AppText, Button, Screen, SectionTitle, spacing } from '@/ui';
import { InviteCodeCard } from '../components/invite-code-card';
import { MatchRules } from '../components/match-rules';
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
      <InviteCodeCard code={match.joinCode} />

      <LocationAccessNotice askMessage="You'll need location access to play. Allow it now so you don't lose time when the match starts." />

      <View style={styles.section}>
        <SectionTitle>{`Players · ${match.players.length}`}</SectionTitle>
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
      </View>

      <View style={styles.section}>
        <SectionTitle>Rules</SectionTitle>
        <MatchRules match={match} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
});
