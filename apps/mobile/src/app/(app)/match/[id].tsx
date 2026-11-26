import { useLocalSearchParams } from 'expo-router';
import { MatchScreen } from '@/features/live-match/match-screen';

export default function MatchRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Keyed by id: switching matches starts from a fresh state.
  return <MatchScreen key={id} matchId={id} />;
}
