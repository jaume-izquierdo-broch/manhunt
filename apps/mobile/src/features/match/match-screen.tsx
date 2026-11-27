import { MatchStatus } from '@manhunt/types';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useEffectEvent } from 'react';
import { Alert } from 'react-native';
import { LobbyScreen } from '@/features/lobby/lobby-screen';
import { goHome } from '@/features/match/match-navigation';
import { useInvalidateCurrentMatch } from '@/features/match/match.queries';
import { useRealtime } from '@/features/realtime/realtime.store';
import { Banner, Button, LoadingView, Screen } from '@/ui';
import { EndMatchButton } from './components/end-match-button';
import { useMatch } from './match.store';
import { PlayScreen } from './play-screen';
import { ResultsScreen } from './results-screen';
import { useLocationTracking } from './use-location-tracking';
import { useMatchConnection } from './use-match-connection';

const isLive = (status: MatchStatus) =>
  status === MatchStatus.HIDING || status === MatchStatus.ACTIVE;

const TITLES: Record<MatchStatus, string> = {
  LOBBY: 'Lobby',
  HIDING: 'Hiding',
  ACTIVE: 'Hunt',
  FINISHED: 'Results',
};

/**
 * The screen of one match. While it's open it stays connected to the match and
 * tracks the GPS; it shows the lobby, the match or the results based on the status.
 */
export function MatchScreen({ matchId }: { matchId: string }) {
  useMatchConnection(matchId);
  useLocationTracking();

  const status = useMatch((s) => s.match?.status);
  const error = useMatch((s) => s.error);
  const closed = useMatch((s) => s.closed);
  const isHost = useMatch((s) => !!s.me && s.match?.hostId === s.me.userId);
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
      <Stack.Screen
        options={{
          title: TITLES[status],
          headerRight:
            isHost && isLive(status)
              ? () => <EndMatchButton matchId={matchId} />
              : undefined,
        }}
      />
      {status === MatchStatus.LOBBY ? <LobbyScreen /> : null}
      {isLive(status) ? <PlayScreen /> : null}
      {status === MatchStatus.FINISHED ? <ResultsScreen /> : null}
    </>
  );
}
