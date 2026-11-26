import type { MatchSettings, Team } from '@manhunt/types';
import { useMutation } from '@tanstack/react-query';
import { useSetCurrentMatch } from '@/features/matches/matches.queries';
import { lobbyApi } from './lobby.api';

export function useCreateLobby() {
  const setCurrent = useSetCurrentMatch();
  return useMutation({
    mutationFn: () => lobbyApi.create(),
    onSuccess: setCurrent,
  });
}

export function useJoinLobby() {
  const setCurrent = useSetCurrentMatch();
  return useMutation({
    mutationFn: (joinCode: string) => lobbyApi.join(joinCode),
    onSuccess: setCurrent,
  });
}

export function useLeaveLobby(matchId: string) {
  const setCurrent = useSetCurrentMatch();
  return useMutation({
    mutationFn: () => lobbyApi.leave(matchId),
    onSuccess: () => setCurrent(null),
  });
}

export function useCloseLobby(matchId: string) {
  const setCurrent = useSetCurrentMatch();
  return useMutation({
    mutationFn: () => lobbyApi.close(matchId),
    onSuccess: () => setCurrent(null),
  });
}

// These return the updated match. The lobby shows it right away instead of
// waiting for the socket's `match:updated` event.

export function useUpdateSettings(matchId: string) {
  return useMutation({
    mutationFn: (settings: MatchSettings) =>
      lobbyApi.updateSettings(matchId, settings),
  });
}

export function useSetTeam(matchId: string) {
  return useMutation({
    mutationFn: ({ userId, team }: { userId: string; team: Team }) =>
      lobbyApi.setTeam(matchId, userId, team),
  });
}

export function useKickPlayer(matchId: string) {
  return useMutation({
    mutationFn: (userId: string) => lobbyApi.kick(matchId, userId),
  });
}
