import { useLocalSearchParams } from 'expo-router';
import { MatchScreen } from '@/features/live-match/match-screen';

export default function MatchRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Keyed by id: switching matches starts a fresh connection and state.
  return <MatchScreen key={id} matchId={id} />;
}
