import type { MatchDto, PlayerDto } from '@manhunt/types';
import {
  type GameState,
  initialGameState,
} from '@/features/game/state/game-state';

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

/** Estado de partida ya cargado para `userId`. */
export function loadedState(
  match: MatchDto,
  userId: string,
  extra: Partial<GameState> = {},
): GameState {
  const mine = match.players.find((p) => p.userId === userId)!;
  return {
    ...initialGameState,
    connection: 'connected',
    match,
    me: { userId, team: mine.team, status: mine.status },
    ...extra,
  };
}
