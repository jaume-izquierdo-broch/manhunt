import type { CreateMatchInput, MatchDto, Team } from '@manhunt/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { matchesApi } from './matches.api';

export const matchKeys = {
  all: ['matches'] as const,
  current: ['matches', 'current'] as const,
};

/** Partida no terminada del usuario (o null). */
export function useCurrentMatch() {
  return useQuery({
    queryKey: matchKeys.current,
    queryFn: matchesApi.current,
    select: (data) => data.match,
  });
}

/** Tras crear/unirse, la "partida actual" pasa a ser esa sin volver a pedirla. */
function useSetCurrent() {
  const queryClient = useQueryClient();
  return (match: MatchDto | null) =>
    queryClient.setQueryData(matchKeys.current, { match });
}

export function useCreateMatch() {
  const setCurrent = useSetCurrent();
  return useMutation({
    mutationFn: (input: CreateMatchInput) => matchesApi.create(input),
    onSuccess: setCurrent,
  });
}

export function useJoinMatch() {
  const setCurrent = useSetCurrent();
  return useMutation({
    mutationFn: (joinCode: string) => matchesApi.join(joinCode),
    onSuccess: setCurrent,
  });
}

export function useLeaveMatch(matchId: string) {
  const setCurrent = useSetCurrent();
  return useMutation({
    mutationFn: () => matchesApi.leave(matchId),
    onSuccess: () => setCurrent(null),
  });
}

export function useCloseMatch(matchId: string) {
  const setCurrent = useSetCurrent();
  return useMutation({
    mutationFn: () => matchesApi.close(matchId),
    onSuccess: () => setCurrent(null),
  });
}

// Las siguientes devuelven el MatchDto actualizado: la pantalla lo aplica a la
// sesión en directo para no esperar al evento `match:updated` del socket.

export function useStartMatch(matchId: string) {
  return useMutation({ mutationFn: () => matchesApi.start(matchId) });
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

/** Al salir de una partida terminada/cerrada, que el inicio vuelva a preguntar. */
export function useInvalidateCurrentMatch() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: matchKeys.current });
}
