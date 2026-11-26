import type {
  MatchDto,
  MatchSettings,
  StartMatchInput,
  Team,
} from '@manhunt/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { matchesApi } from './matches.api';

export const matchKeys = {
  current: ['matches', 'current'] as const,
};

/** The user's unfinished match, or null. */
export function useCurrentMatch() {
  return useQuery({
    queryKey: matchKeys.current,
    queryFn: matchesApi.current,
    select: (data) => data.match,
  });
}

/** After creating or joining, that match becomes the "current match" without refetching. */
function useSetCurrentMatch() {
  const queryClient = useQueryClient();
  return (match: MatchDto | null) =>
    queryClient.setQueryData(matchKeys.current, { match });
}

/** Makes the home screen fetch the current match again (e.g. after leaving one). */
export function useInvalidateCurrentMatch() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: matchKeys.current });
}

export function useCreateMatch() {
  const setCurrent = useSetCurrentMatch();
  return useMutation({
    mutationFn: () => matchesApi.create(),
    onSuccess: setCurrent,
  });
}

export function useJoinMatch() {
  const setCurrent = useSetCurrentMatch();
  return useMutation({
    mutationFn: (joinCode: string) => matchesApi.join(joinCode),
    onSuccess: setCurrent,
  });
}

export function useLeaveMatch(matchId: string) {
  const setCurrent = useSetCurrentMatch();
  return useMutation({
    mutationFn: () => matchesApi.leave(matchId),
    onSuccess: () => setCurrent(null),
  });
}

export function useCloseMatch(matchId: string) {
  const setCurrent = useSetCurrentMatch();
  return useMutation({
    mutationFn: () => matchesApi.close(matchId),
    onSuccess: () => setCurrent(null),
  });
}

// These return the updated MatchDto. The lobby applies it to the live session
// right away instead of waiting for the socket's `match:updated` event.

export function useStartMatch(matchId: string) {
  return useMutation({
    mutationFn: (host: StartMatchInput) => matchesApi.start(matchId, host),
  });
}

export function useUpdateSettings(matchId: string) {
  return useMutation({
    mutationFn: (settings: MatchSettings) =>
      matchesApi.updateSettings(matchId, settings),
  });
}

export function useSetTeam(matchId: string) {
  return useMutation({
    mutationFn: ({ userId, team }: { userId: string; team: Team }) =>
      matchesApi.setTeam(matchId, userId, team),
  });
}

export function useKickPlayer(matchId: string) {
  return useMutation({
    mutationFn: (userId: string) => matchesApi.kick(matchId, userId),
  });
}
