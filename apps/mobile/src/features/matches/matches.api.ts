import type { CreateMatchInput, MatchDto, Team } from '@manhunt/types';
import { api } from '@/lib/http/api-client';

/** Endpoints REST de partidas (ver README principal). */
export const matchesApi = {
  current: () => api.get<{ match: MatchDto | null }>('/matches/current'),
  get: (id: string) => api.get<MatchDto>(`/matches/${id}`),
  create: (input: CreateMatchInput) => api.post<MatchDto>('/matches', input),
  join: (joinCode: string) => api.post<MatchDto>('/matches/join', { joinCode }),
  leave: (id: string) => api.post<void>(`/matches/${id}/leave`),
  close: (id: string) => api.delete<void>(`/matches/${id}`),
  setTeam: (id: string, userId: string, team: Team) =>
    api.patch<MatchDto>(`/matches/${id}/players/${userId}`, { team }),
  kick: (id: string, userId: string) =>
    api.delete<MatchDto>(`/matches/${id}/players/${userId}`),
  start: (id: string) => api.post<MatchDto>(`/matches/${id}/start`),
};
