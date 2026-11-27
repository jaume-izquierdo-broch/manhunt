import { Alert, Pressable } from 'react-native';
import { errorMessage } from '@/lib/http/api-error';
import { AppText } from '@/ui';
import { useMatch } from '../match.store';
import { useEndMatch } from '../match.queries';

/** In the header, for the host: calls the match off. Nobody wins. */
export function EndMatchButton({ matchId }: { matchId: string }) {
  const end = useEndMatch(matchId);

  const confirm = () =>
    Alert.alert(
      'End the match?',
      'Nobody wins, and everyone goes to the results.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End match',
          style: 'destructive',
          onPress: async () => {
            try {
              useMatch.getState().updateMatch(await end.mutateAsync());
            } catch (error) {
              Alert.alert('Could not end the match', errorMessage(error));
            }
          },
        },
      ],
    );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="End match"
      hitSlop={12}
      disabled={end.isPending}
      onPress={confirm}
    >
      <AppText variant="label" tone="danger">
        End
      </AppText>
    </Pressable>
  );
}
