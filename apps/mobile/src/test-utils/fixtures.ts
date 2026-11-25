import type { MatchDto, PlayerDto } from '@manhunt/types';

export const player = (
  userId: string,
  team: PlayerDto['team'],
  extra: Partial<PlayerDto> = {},
): PlayerDto => ({
  userId,
  username: userId,
  team,
  status: 'ALIVE',
  caughtBy: null,
  caughtAt: null,
  ...extra,
});

export const makeMatch = (overrides: Partial<MatchDto> = {}): MatchDto => ({
  id: 'm1',
  joinCode: 'ABC234',
  hostId: 'host',
  status: 'WAITING',
  playArea: { lat: 41.387, lng: 2.17, radiusMeters: 400 },
  hidingSeconds: 120,
  durationSeconds: 1800,
  pingIntervalSeconds: 120,
  winnerTeam: null,
  createdAt: '2026-01-01T10:00:00.000Z',
  startedAt: null,
  hidingEndsAt: null,
  endsAt: null,
  endedAt: null,
  players: [player('host', 'HUNTER')],
  ...overrides,
});
