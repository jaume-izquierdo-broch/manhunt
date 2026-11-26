import type {
  MatchDto,
  MatchSettings,
  StartMatchInput,
  Team,
} from '@manhunt/types';
import { api } from '@/lib/http/api-client';

/** Match REST endpoints (see the main README). */
export const matchesApi = {
  current: () => api.get<{ match: MatchDto | null }>('/matches/current'),
  get: (id: string) => api.get<MatchDto>(`/matches/${id}`),
  create: () => api.post<MatchDto>('/matches', {}),
  join: (joinCode: string) => api.post<MatchDto>('/matches/join', { joinCode }),
  leave: (id: string) => api.post<void>(`/matches/${id}/leave`),
  close: (id: string) => api.delete<void>(`/matches/${id}`),
  setTeam: (id: string, userId: string, team: Team) =>
    api.patch<MatchDto>(`/matches/${id}/players/${userId}`, { team }),
  kick: (id: string, userId: string) =>
    api.delete<MatchDto>(`/matches/${id}/players/${userId}`),
  updateSettings: (id: string, settings: MatchSettings) =>
    api.patch<MatchDto>(`/matches/${id}/settings`, settings),
  start: (id: string, host: StartMatchInput) =>
    api.post<MatchDto>(`/matches/${id}/start`, host),
};
