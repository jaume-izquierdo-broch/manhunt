import { useLocalSearchParams } from 'expo-router';
import { GameSessionProvider } from '@/features/game/session/game-session';
import { MatchScreen } from '@/features/game/views/match-screen';

/** Una partida: la conexión en directo vive mientras estás en esta pantalla. */
export default function MatchRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    // key: si cambias de partida, conexión y estado empiezan de cero.
    <GameSessionProvider key={id} matchId={id}>
      <MatchScreen />
    </GameSessionProvider>
  );
}
