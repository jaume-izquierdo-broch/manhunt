import type { MatchDto, StartMatchInput } from '@manhunt/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { matchApi } from './match.api';

export const matchKeys = {
  current: ['matches', 'current'] as const,
};

/** The user's unfinished match (lobby or live), or null. */
export function useCurrentMatch() {
  return useQuery({
    queryKey: matchKeys.current,
    queryFn: matchApi.current,
    select: (data) => data.match,
  });
}

/** After creating, joining or leaving, updates the "current match" without refetching. */
export function useSetCurrentMatch() {
  const queryClient = useQueryClient();
  return (match: MatchDto | null) =>
    queryClient.setQueryData(matchKeys.current, { match });
}

/** Makes the home screen fetch the current match again (e.g. after leaving one). */
export function useInvalidateCurrentMatch() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: matchKeys.current });
}

/** Returns the started match. The lobby shows it right away instead of waiting for the socket. */
export function useStartMatch(matchId: string) {
  return useMutation({
    mutationFn: (host: StartMatchInput) => matchApi.start(matchId, host),
  });
}
