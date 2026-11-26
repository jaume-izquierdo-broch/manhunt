import type { MatchDto, MatchSettings, Team } from '@manhunt/types';
import { api } from '@/lib/http/api-client';

/** The lobby's endpoints. A lobby is a match that hasn't started, so it shares its id. */
export const lobbyApi = {
  create: () => api.post<MatchDto>('/lobbies', {}),
  join: (joinCode: string) => api.post<MatchDto>('/lobbies/join', { joinCode }),
  leave: (id: string) => api.post<void>(`/lobbies/${id}/leave`),
  close: (id: string) => api.delete<void>(`/lobbies/${id}`),
  updateSettings: (id: string, settings: MatchSettings) =>
    api.patch<MatchDto>(`/lobbies/${id}/settings`, settings),
  setTeam: (id: string, userId: string, team: Team) =>
    api.patch<MatchDto>(`/lobbies/${id}/players/${userId}`, { team }),
  kick: (id: string, userId: string) =>
    api.delete<MatchDto>(`/lobbies/${id}/players/${userId}`),
};
