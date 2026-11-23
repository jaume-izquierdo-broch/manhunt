import type { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { ApiError, errorMessage } from '@/lib/http/api-error';

type Router = ReturnType<typeof useRouter>;

export function goToMatch(router: Router, matchId: string) {
  router.replace({ pathname: '/match/[id]', params: { id: matchId } });
}

/**
 * Handles an error from creating or joining a match. If the user is already in
 * another match, offers to go there and returns null; otherwise returns the
 * message to show inline.
 */
export function handleMatchEntryError(
  router: Router,
  error: unknown,
): string | null {
  const openMatchId = error instanceof ApiError ? error.openMatchId : null;
  if (!openMatchId) return errorMessage(error);

  Alert.alert(
    "You're already in a match",
    'You can only be in one match at a time.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Go to my match', onPress: () => goToMatch(router, openMatchId) },
    ],
  );
  return null;
}
