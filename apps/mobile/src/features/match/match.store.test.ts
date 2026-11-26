import type { MatchDto, MatchSnapshot, PlayerDto } from '@manhunt/types';
import { useMatch } from './match.store';

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
  lobbyLocation: null,
  ...extra,
});

const baseMatch: MatchDto = {
  id: 'm1',
  joinCode: 'ABC234',
  hostId: 'hunter',
  status: 'ACTIVE',
  radiusMeters: 400,
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

/** The store after receiving the snapshot (seen by runner1). */
function loaded(overrides?: Partial<MatchSnapshot>) {
  const store = useMatch.getState();
  store.reset();
  store.loadSnapshot(
    snapshot(overrides),
    Date.parse('2026-01-01T10:01:28.000Z'),
  );
  return useMatch.getState();
}

const state = () => useMatch.getState();

describe('live match store', () => {
  it('loadSnapshot: loads the match, teammates and clock offset', () => {
    loaded();
    expect(state().match?.id).toBe('m1');
    expect(state().me?.team).toBe('RUNNER');
    expect(Object.keys(state().teammates)).toEqual(['runner2']);
    expect(state().clockOffsetMs).toBe(2000);
  });

  it('a new snapshot clears the previous error', () => {
    const store = loaded();
    store.failed('Match not found');
    expect(state().error).toBe('Match not found');
    loaded();
    expect(state().error).toBeNull();
  });

  it('teammateMoved: stores teammates but ignores my own position', () => {
    const store = loaded();
    const position = {
      userId: 'runner2',
      lat: 5,
      lng: 6,
      accuracy: 3,
      at: 'x',
    };
    store.teammateMoved(position);
    expect(state().teammates.runner2).toEqual(position);

    store.teammateMoved({ ...position, userId: 'runner1' });
    expect(state().teammates.runner1).toBeUndefined();
  });

  it('updateMatch: recomputes my team and clears teammates when it changes', () => {
    loaded().updateMatch({
      ...baseMatch,
      players: baseMatch.players.map((p) =>
        p.userId === 'runner1' ? { ...p, team: 'HUNTER' as const } : p,
      ),
    });
    expect(state().me?.team).toBe('HUNTER');
    expect(state().teammates).toEqual({});
  });

  it('updateMatch: marks the match closed when I am no longer in it', () => {
    loaded().updateMatch({
      ...baseMatch,
      players: baseMatch.players.filter((p) => p.userId !== 'runner1'),
    });
    expect(state().closed).toBe(true);
  });

  it('updateMatch for another match is ignored', () => {
    loaded().updateMatch({ ...baseMatch, id: 'another' });
    expect(state().match?.id).toBe('m1');
  });

  it('playerCaught: marks the runner, and me if I am the one caught', () => {
    const caught = {
      matchId: 'm1',
      runnerId: 'runner1',
      hunterId: 'hunter',
      at: 'T',
      runnersRemaining: 1,
    };
    loaded().playerCaught(caught);
    expect(state().me?.status).toBe('CAUGHT');
    expect(
      state().match?.players.find((p) => p.userId === 'runner1'),
    ).toMatchObject({ status: 'CAUGHT', caughtBy: 'hunter' });
    expect(state().lastCatch).toEqual(caught);
  });

  it('playerCaught of a teammate removes their position', () => {
    loaded().playerCaught({
      matchId: 'm1',
      runnerId: 'runner2',
      hunterId: 'hunter',
      at: 'T',
      runnersRemaining: 1,
    });
    expect(state().teammates.runner2).toBeUndefined();
    expect(state().me?.status).toBe('ALIVE');
  });

  it('pings: hunters keep the latest ping; runners, when they were spotted', () => {
    const store = loaded();
    const ping = { matchId: 'm1', at: 'T1', runners: [], nextPingAt: 'T2' };
    store.pingRevealed(ping);
    expect(state().lastPing).toEqual(ping);

    store.spottedByHunters({ matchId: 'm1', at: 'T3', nextPingAt: 'T4' });
    expect(state().lastSpottedAt).toBe('T3');
  });

  it('matchFinished: ends the match with the winner', () => {
    loaded().matchFinished({
      matchId: 'm1',
      winnerTeam: 'HUNTER',
      endedAt: 'T',
    });
    expect(state().match).toMatchObject({
      status: 'FINISHED',
      winnerTeam: 'HUNTER',
      endedAt: 'T',
    });
  });

  it('matchClosed', () => {
    loaded().matchClosed();
    expect(state().closed).toBe(true);
  });

  it('reset empties everything', () => {
    loaded().reset();
    expect(state()).toMatchObject({ match: null, me: null, teammates: {} });
  });
});
