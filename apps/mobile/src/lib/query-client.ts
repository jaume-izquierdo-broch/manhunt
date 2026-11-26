import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';
import { ApiError } from './http/api-error';

// React Native has no window focus: coming back to the app counts as focus,
// so stale data is fetched again.
focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener('change', (state) =>
    setFocused(state === 'active'),
  );
  return () => subscription.remove();
});

/** Retrying only makes sense for network and server errors, not when the API said no. */
function isRetryable(error: unknown): boolean {
  return (
    !(error instanceof ApiError) || error.status === 0 || error.status >= 500
  );
}

/**
 * The cache of everything fetched from the REST API (React Query).
 * A single instance, so signing out can clear it from the session store.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => failureCount < 2 && isRetryable(error),
      staleTime: 10_000,
    },
    mutations: { retry: false },
  },
});
