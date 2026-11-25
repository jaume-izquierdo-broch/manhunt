import { MatchStatus } from '@manhunt/types';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useEffectEvent } from 'react';
import { Alert } from 'react-native';
import { useInvalidateCurrentMatch } from '@/features/matches/matches.queries';
import { Banner, Button, LoadingView, Screen } from '@/ui';
import { useGameSession } from '../session/game-session';
import { LobbyView } from './lobby-view';
import { PlayView } from './play-view';
import { ResultsView } from './results-view';

const TITLES: Record<MatchStatus, string> = {
  WAITING: 'Lobby',
  HIDING: 'Hiding',
  ACTIVE: 'Hunt',
  FINISHED: 'Results',
};

/** A match screen: shows the lobby, the game or the results depending on the status. */
export function MatchScreen() {
  const { state } = useGameSession();
  const router = useRouter();
  const invalidateCurrentMatch = useInvalidateCurrentMatch();

  const onClosed = useEffectEvent(() => {
    void invalidateCurrentMatch();
    router.replace('/');
    Alert.alert(
      'Match closed',
      'The host closed the lobby or removed you from it.',
    );
  });
  useEffect(() => {
    if (state.closed) onClosed();
  }, [state.closed]);

  if (!state.match) {
    return state.error ? (
      <Screen
        footer={
          <Button title="Back to home" onPress={() => router.replace('/')} />
        }
      >
        <Banner tone="danger" message={state.error} />
      </Screen>
    ) : (
      <LoadingView message="Connecting to the match…" />
    );
  }

  const status = state.match.status;
  return (
    <>
      <Stack.Screen options={{ title: TITLES[status] }} />
      {status === MatchStatus.WAITING ? <LobbyView /> : null}
      {status === MatchStatus.HIDING || status === MatchStatus.ACTIVE ? (
        <PlayView />
      ) : null}
      {status === MatchStatus.FINISHED ? <ResultsView /> : null}
    </>
  );
}
