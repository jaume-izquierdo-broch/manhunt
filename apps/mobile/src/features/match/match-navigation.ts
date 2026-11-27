import type { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { ApiError, errorMessage } from '@/lib/http/api-error';
import { ensurePreciseLocation } from '@/features/location/location-access.store';

type Router = ReturnType<typeof useRouter>;

/** Opens the match on top of home, replacing the current screen unless it's home. */
export function goToMatch(router: Router, matchId: string) {
  router.dismissTo('/');
  router.push({ pathname: '/match/[id]', params: { id: matchId } });
}

/** Opens a match you're already in, only with the precise location on. */
export async function enterMatch(router: Router, matchId: string) {
  if (await ensurePreciseLocation()) goToMatch(router, matchId);
}

/** Back to the home screen that is already under the match. */
export function goHome(router: Router) {
  router.dismissTo('/');
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
      {
        text: 'Go to my match',
        onPress: () => void enterMatch(router, openMatchId),
      },
    ],
  );
  return null;
}
