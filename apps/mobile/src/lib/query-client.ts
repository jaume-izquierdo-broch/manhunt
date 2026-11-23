import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './http/api-error';

/** Errores que no tiene sentido reintentar (el servidor ya ha dicho que no). */
function isRetryable(error: unknown): boolean {
  return (
    !(error instanceof ApiError) || error.status === 0 || error.status >= 500
  );
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => failureCount < 2 && isRetryable(error),
        staleTime: 10_000,
      },
      mutations: { retry: false },
    },
  });
}
