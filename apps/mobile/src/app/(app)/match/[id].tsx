import { useLocalSearchParams } from 'expo-router';
import { GameSessionProvider } from '@/features/game/session/game-session';
import { MatchScreen } from '@/features/game/views/match-screen';

/** A match. The live connection lasts as long as this screen is open. */
export default function MatchRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    // Keyed by id: switching matches starts a fresh connection and state.
    <GameSessionProvider key={id} matchId={id}>
      <MatchScreen />
    </GameSessionProvider>
  );
}
