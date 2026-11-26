import { type MatchDto, Team } from '@manhunt/types';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useCurrentUser } from '@/features/auth/session.store';
import { LocationAccessNotice } from '@/features/location/location-access-notice';
import { goHome } from '@/features/match/match-navigation';
import { useStartMatch } from '@/features/match/match.queries';
import { errorMessage } from '@/lib/http/api-error';
import { getCurrentPosition } from '@/lib/location/device-location';
import { AppText, Button, Screen, SectionTitle, spacing } from '@/ui';
import { useMatch, useLoadedMatch } from '@/features/match/match.store';
import {
  hasBalancedTeams,
  playersOfTeam,
} from '@/features/match/rules/players';
import { useServerNow } from '@/features/match/use-server-clock';
import { InviteCodeCard } from './components/invite-code-card';
import { LobbyLocation } from './components/lobby-location';
import { MatchRules } from './components/match-rules';
import { TeamSection } from './components/team-section';
import {
  useCloseLobby,
  useKickPlayer,
  useLeaveLobby,
  useSetTeam,
  useUpdateSettings,
} from './lobby.queries';
import { playersNotReady } from './readiness';

const otherTeam = (team: Team) =>
  team === Team.HUNTER ? Team.RUNNER : Team.HUNTER;

/**
 * The lobby: a code to invite players, the teams with who is ready, and the
 * rules. The host edits the rules and starts the match where they stand.
 */
export function LobbyScreen() {
  const userId = useCurrentUser().user.id;
  const match = useLoadedMatch();
  const updateMatch = useMatch((s) => s.updateMatch);
  const clockOffsetMs = useMatch((s) => s.clockOffsetMs);
  const now = useServerNow(clockOffsetMs, 5_000);
  const router = useRouter();
  const isHost = match.hostId === userId;
  const [locating, setLocating] = useState(false);

  const balanced = hasBalancedTeams(match);
  const notReady = playersNotReady(match, now);

  const setTeam = useSetTeam(match.id);
  const kick = useKickPlayer(match.id);
  const start = useStartMatch(match.id);
  const leave = useLeaveLobby(match.id);
  const close = useCloseLobby(match.id);
  const updateSettings = useUpdateSettings(match.id);

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

  /** The play area is centered where the host is right now. */
  const startHere = async () => {
    setLocating(true);
    try {
      const position =
        useMatch.getState().myPosition ?? (await getCurrentPosition());
      await runHostAction('Could not start the match', () =>
        start.mutateAsync({
          lat: position.lat,
          lng: position.lng,
          ...(position.accuracy !== null && { accuracy: position.accuracy }),
        }),
      );
    } catch (error) {
      Alert.alert('Could not start the match', errorMessage(error));
    } finally {
      setLocating(false);
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
            goHome(router);
          } catch (error) {
            Alert.alert('Something went wrong', errorMessage(error));
          }
        },
      },
    ]);

  const hostFooter = (
    <>
      <Button
        title="Start match"
        icon="flag-outline"
        disabled={!balanced || notReady.length > 0}
        loading={locating || start.isPending}
        onPress={() => void startHere()}
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

      <LocationAccessNotice askMessage="Everyone shares their location in the lobby, so the match can start around the host." />

      <View style={styles.section}>
        <SectionTitle>{`Players · ${match.players.length}`}</SectionTitle>
        {[Team.HUNTER, Team.RUNNER].map((team) => (
          <TeamSection
            key={team}
            team={team}
            players={playersOfTeam(match, team)}
            userId={userId}
            hostId={match.hostId}
            detailOf={(player) => (
              <LobbyLocation match={match} player={player} now={now} />
            )}
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
        <MatchRules
          match={match}
          onChange={
            isHost
              ? (settings) =>
                  runHostAction('Could not change the rules', () =>
                    updateSettings.mutateAsync(settings),
                  )
              : undefined
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
});
