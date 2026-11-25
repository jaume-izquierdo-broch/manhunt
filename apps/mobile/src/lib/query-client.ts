import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './http/api-error';

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
