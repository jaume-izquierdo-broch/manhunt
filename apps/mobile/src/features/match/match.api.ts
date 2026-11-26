import type { MatchDto, StartMatchInput } from '@manhunt/types';
import { api } from '@/lib/http/api-client';

/** Reading a match and starting it. The lobby's endpoints are in `lobby.api.ts`. */
export const matchApi = {
  current: () => api.get<{ match: MatchDto | null }>('/matches/current'),
  get: (id: string) => api.get<MatchDto>(`/matches/${id}`),
  start: (id: string, host: StartMatchInput) =>
    api.post<MatchDto>(`/matches/${id}/start`, host),
};
