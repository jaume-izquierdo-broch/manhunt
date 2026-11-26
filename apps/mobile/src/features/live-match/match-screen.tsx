import { MatchStatus } from '@manhunt/types';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useEffectEvent } from 'react';
import { Alert } from 'react-native';
import { goHome } from '@/features/matches/match-navigation';
import { useInvalidateCurrentMatch } from '@/features/matches/matches.queries';
import { useRealtime } from '@/features/realtime/realtime.store';
import { Banner, Button, LoadingView, Screen } from '@/ui';
import { useLiveMatch } from './live-match.store';
import { LobbyPhase } from './phases/lobby-phase';
import { PlayPhase } from './phases/play-phase';
import { ResultsPhase } from './phases/results-phase';
import { useLocationTracking } from './use-location-tracking';
import { useMatchConnection } from './use-match-connection';

const TITLES: Record<MatchStatus, string> = {
  WAITING: 'Lobby',
  HIDING: 'Hiding',
  ACTIVE: 'Hunt',
  FINISHED: 'Results',
};

/**
 * The screen of one match. While it's open it stays connected to the match and
 * tracks the GPS; it shows the lobby, the game or the results based on the status.
 */
export function MatchScreen({ matchId }: { matchId: string }) {
  useMatchConnection(matchId);
  useLocationTracking();

  const status = useLiveMatch((s) => s.match?.status);
  const error = useLiveMatch((s) => s.error);
  const closed = useLiveMatch((s) => s.closed);
  const connected = useRealtime((s) => s.status === 'connected');
  const router = useRouter();
  const invalidateCurrentMatch = useInvalidateCurrentMatch();

  const onClosed = useEffectEvent(() => {
    void invalidateCurrentMatch();
    goHome(router);
    Alert.alert(
      'Match closed',
      'The host closed the lobby or removed you from it.',
    );
  });
  useEffect(() => {
    if (closed) onClosed();
  }, [closed]);

  if (!status) {
    return error ? (
      <Screen
        footer={<Button title="Back to home" onPress={() => goHome(router)} />}
      >
        <Banner tone="danger" message={error} />
      </Screen>
    ) : (
      <LoadingView
        message={connected ? 'Loading the match…' : 'Connecting to the server…'}
      />
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: TITLES[status] }} />
      {status === MatchStatus.WAITING ? <LobbyPhase /> : null}
      {status === MatchStatus.HIDING || status === MatchStatus.ACTIVE ? (
        <PlayPhase />
      ) : null}
      {status === MatchStatus.FINISHED ? <ResultsPhase /> : null}
    </>
  );
}
