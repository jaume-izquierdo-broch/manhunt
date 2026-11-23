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
  WAITING: 'Sala',
  HIDING: 'Escondite',
  ACTIVE: 'Caza',
  FINISHED: 'Resultados',
};

/** Pantalla de una partida: muestra la sala, el juego o los resultados según su estado. */
export function MatchScreen() {
  const { state } = useGameSession();
  const router = useRouter();
  const invalidateCurrent = useInvalidateCurrentMatch();

  const onClosed = useEffectEvent(() => {
    void invalidateCurrent();
    router.replace('/');
    Alert.alert(
      'Partida cerrada',
      'El anfitrión ha cerrado la sala o te ha expulsado.',
    );
  });
  useEffect(() => {
    if (state.closed) onClosed();
  }, [state.closed]);

  if (!state.match) {
    return state.error ? (
      <Screen
        footer={
          <Button
            title="Volver al inicio"
            onPress={() => router.replace('/')}
          />
        }
      >
        <Banner tone="danger" message={state.error} />
      </Screen>
    ) : (
      <LoadingView message="Conectando con la partida…" />
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
