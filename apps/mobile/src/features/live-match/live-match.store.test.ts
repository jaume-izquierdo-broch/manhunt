import type { MatchDto, MatchSnapshot, PlayerDto } from '@manhunt/types';
import {
  aliveRunners,
  gameReducer,
  type GameState,
  hasBalancedTeams,
  initialGameState,
  playerName,
} from './game-state';

const player = (
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

const baseMatch: MatchDto = {
  id: 'm1',
  joinCode: 'ABC234',
  hostId: 'hunter',
  status: 'ACTIVE',
  playArea: { lat: 41.387, lng: 2.17, radiusMeters: 400 },
  hidingSeconds: 60,
  durationSeconds: 600,
  pingIntervalSeconds: 60,
  winnerTeam: null,
  createdAt: '2026-01-01T10:00:00.000Z',
  startedAt: '2026-01-01T10:00:00.000Z',
  hidingEndsAt: '2026-01-01T10:01:00.000Z',
  endsAt: '2026-01-01T10:11:00.000Z',
  endedAt: null,
  players: [
    player('hunter', 'HUNTER'),
    player('runner1', 'RUNNER'),
    player('runner2', 'RUNNER'),
  ],
};

const snapshot = (overrides: Partial<MatchSnapshot> = {}): MatchSnapshot => ({
  match: baseMatch,
  me: { userId: 'runner1', team: 'RUNNER', status: 'ALIVE' },
  teammates: [
    {
      userId: 'runner2',
      lat: 1,
      lng: 2,
      accuracy: null,
      at: '2026-01-01T10:02:00.000Z',
    },
  ],
  lastPing: null,
  nextPingAt: '2026-01-01T10:02:00.000Z',
  serverTime: '2026-01-01T10:01:30.000Z',
  ...overrides,
});

function loaded(overrides?: Partial<MatchSnapshot>): GameState {
  return gameReducer(initialGameState, {
    type: 'snapshot',
    snapshot: snapshot(overrides),
    receivedAt: Date.parse('2026-01-01T10:01:28.000Z'),
  });
}

describe('gameReducer', () => {
  it('snapshot: loads the match, teammates and clock offset', () => {
    const state = loaded();
    expect(state.match?.id).toBe('m1');
    expect(state.me?.team).toBe('RUNNER');
    expect(Object.keys(state.teammates)).toEqual(['runner2']);
    expect(state.clockOffsetMs).toBe(2000);
  });

  it('connection: reconnecting, then connected again, clears the error', () => {
    let state = gameReducer(loaded(), { type: 'disconnected' });
    expect(state.connection).toBe('reconnecting');
    state = gameReducer(state, { type: 'failed', message: 'offline' });
    state = gameReducer(state, { type: 'connected' });
    expect(state).toMatchObject({ connection: 'connected', error: null });
  });

  it('position: stores teammates but ignores my own position', () => {
    const position = {
      userId: 'runner2',
      lat: 5,
      lng: 6,
      accuracy: 3,
      at: 'x',
    };
    let state = gameReducer(loaded(), { type: 'position', position });
    expect(state.teammates.runner2).toEqual(position);

    const before = state;
    state = gameReducer(state, {
      type: 'position',
      position: { ...position, userId: 'runner1' },
    });
    expect(state).toBe(before);
  });

  it('matchUpdated: recomputes my team and clears teammates when it changes', () => {
    const match = {
      ...baseMatch,
      players: baseMatch.players.map((p) =>
        p.userId === 'runner1' ? { ...p, team: 'HUNTER' as const } : p,
      ),
    };
    const state = gameReducer(loaded(), { type: 'matchUpdated', match });
    expect(state.me?.team).toBe('HUNTER');
    expect(state.teammates).toEqual({});
  });

  it('matchUpdated: marks the match closed when I am no longer in it', () => {
    const match = {
      ...baseMatch,
      players: baseMatch.players.filter((p) => p.userId !== 'runner1'),
    };
    expect(gameReducer(loaded(), { type: 'matchUpdated', match }).closed).toBe(
      true,
    );
  });

  it('matchUpdated for another match is ignored', () => {
    const state = loaded();
    expect(
      gameReducer(state, {
        type: 'matchUpdated',
        match: { ...baseMatch, id: 'another' },
      }),
    ).toBe(state);
  });

  it('playerCaught: marks the runner, and me if I am the one caught', () => {
    const caught = {
      matchId: 'm1',
      runnerId: 'runner1',
      hunterId: 'hunter',
      at: 'T',
      runnersRemaining: 1,
    };
    const state = gameReducer(loaded(), { type: 'playerCaught', caught });
    expect(state.me?.status).toBe('CAUGHT');
    expect(
      state.match?.players.find((p) => p.userId === 'runner1'),
    ).toMatchObject({
      status: 'CAUGHT',
      caughtBy: 'hunter',
    });
    expect(state.lastCatch).toEqual(caught);
  });

  it('playerCaught of a teammate removes their position', () => {
    const caught = {
      matchId: 'm1',
      runnerId: 'runner2',
      hunterId: 'hunter',
      at: 'T',
      runnersRemaining: 1,
    };
    const state = gameReducer(loaded(), { type: 'playerCaught', caught });
    expect(state.teammates.runner2).toBeUndefined();
    expect(state.me?.status).toBe('ALIVE');
  });

  it('pings: hunters keep the latest ping; runners, when they were seen', () => {
    const ping = { matchId: 'm1', at: 'T1', runners: [], nextPingAt: 'T2' };
    let state = gameReducer(loaded(), { type: 'pingReveal', ping });
    expect(state.lastPing).toEqual(ping);

    state = gameReducer(state, {
      type: 'pingNotice',
      notice: { matchId: 'm1', at: 'T3', nextPingAt: 'T4' },
    });
    expect(state.lastNoticeAt).toBe('T3');
  });

  it('matchFinished: ends the match with the winner', () => {
    const state = gameReducer(loaded(), {
      type: 'matchFinished',
      finished: { matchId: 'm1', winnerTeam: 'HUNTER', endedAt: 'T' },
    });
    expect(state.match).toMatchObject({
      status: 'FINISHED',
      winnerTeam: 'HUNTER',
      endedAt: 'T',
    });
  });

  it('matchClosed', () => {
    expect(gameReducer(loaded(), { type: 'matchClosed' }).closed).toBe(true);
  });
});

describe('selectors', () => {
  it('aliveRunners, hasBalancedTeams and playerName', () => {
    const match = {
      ...baseMatch,
      players: baseMatch.players.map((p) =>
        p.userId === 'runner2' ? { ...p, status: 'CAUGHT' as const } : p,
      ),
    };
    expect(aliveRunners(match).map((p) => p.userId)).toEqual(['runner1']);
    expect(hasBalancedTeams(match)).toBe(true);
    expect(
      hasBalancedTeams({ ...match, players: [player('hunter', 'HUNTER')] }),
    ).toBe(false);
    expect(playerName(match, 'runner1')).toBe('runner1');
    expect(playerName(match, 'nobody')).toBe('Someone');
  });
});
