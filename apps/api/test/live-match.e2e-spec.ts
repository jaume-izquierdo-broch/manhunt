import type { MatchDto } from '@manhunt/types';
import { type ClientSocket, emit, waitFor } from './support/socket.js';
import {
  metersNorth,
  ORIGIN,
  type TestPlayer,
  useTestApp,
} from './support/test-app.js';

describe('live match', () => {
  const t = useTestApp();

  interface Setup {
    match: MatchDto;
    hunter: TestPlayer;
    runner: TestPlayer;
    hunterSocket: ClientSocket;
    runnerSocket: ClientSocket;
  }

  /** A hunter and a runner, both subscribed, with the match already ACTIVE (no hiding phase). */
  async function startedMatch(pingIntervalSeconds = 60): Promise<Setup> {
    const hunter = await t.register('hunter');
    const runner = await t.register('runner');
    const match = (
      await hunter.api
        .post('/lobbies', {
          radiusMeters: 500,
          hidingSeconds: 0,
          durationSeconds: 600,
          pingIntervalSeconds,
        })
        .expect(201)
    ).body as MatchDto;
    await runner.api
      .post('/lobbies/join', { joinCode: match.joinCode })
      .expect(200);

    const [hunterSocket, runnerSocket] = await Promise.all([
      hunter.connect(),
      runner.connect(),
    ]);
    for (const socket of [hunterSocket, runnerSocket]) {
      const ack = await emit(socket, 'match:subscribe', { matchId: match.id });
      expect(ack.ok).toBe(true);
    }

    await emit(runnerSocket, 'location:update', ORIGIN);

    const active = waitFor(
      runnerSocket,
      'match:updated',
      (m) => m.status === 'ACTIVE',
    );
    const started = await hunter.api
      .post(`/matches/${match.id}/start`, ORIGIN)
      .expect(200);
    expect((started.body as MatchDto).status).toBe('HIDING');
    await active;

    return { match, hunter, runner, hunterSocket, runnerSocket };
  }

  it('unsubscribing stops the match events but keeps the socket open', async () => {
    const host = await t.register('host');
    const ana = await t.register('ana');
    const bob = await t.register('bob');
    const match = (
      await host.api
        .post('/lobbies', {
          radiusMeters: 500,
          hidingSeconds: 0,
          durationSeconds: 600,
          pingIntervalSeconds: 60,
        })
        .expect(201)
    ).body as MatchDto;
    await ana.api
      .post('/lobbies/join', { joinCode: match.joinCode })
      .expect(200);
    const [hostSocket, anaSocket] = await Promise.all([
      host.connect(),
      ana.connect(),
    ]);
    for (const socket of [hostSocket, anaSocket]) {
      await emit(socket, 'match:subscribe', { matchId: match.id });
    }

    const left = await emit(anaSocket, 'match:unsubscribe', {
      matchId: match.id,
    });
    expect(left).toEqual({ ok: true, data: null });

    let anaGotUpdate = false;
    anaSocket.on('match:updated', () => (anaGotUpdate = true));
    const hostGotUpdate = waitFor(
      hostSocket,
      'match:updated',
      (m) => m.players.length === 3,
    );
    await bob.api
      .post('/lobbies/join', { joinCode: match.joinCode })
      .expect(200);
    await hostGotUpdate;
    await new Promise((r) => setTimeout(r, 300));

    expect(anaGotUpdate).toBe(false);
    expect(anaSocket.connected).toBe(true);
  });

  it('only the host can start the match, and only once', async () => {
    const { match, hunter, runner } = await startedMatch();
    await runner.api.post(`/matches/${match.id}/start`, ORIGIN).expect(403);
    const again = await hunter.api
      .post(`/matches/${match.id}/start`, ORIGIN)
      .expect(409);
    expect(again.body.code).toBe('INVALID_MATCH_STATUS');
  });

  it('live positions only reach teammates', async () => {
    const { hunterSocket, runnerSocket } = await startedMatch();
    let runnerSawHunter = false;
    runnerSocket.on('player:position', () => (runnerSawHunter = true));

    const ack = await emit(hunterSocket, 'location:update', {
      ...ORIGIN,
      accuracy: 5,
    });
    expect(ack.ok).toBe(true);
    await new Promise((r) => setTimeout(r, 300));
    expect(runnerSawHunter).toBe(false);
  });

  it('validates catch attempts', async () => {
    const { runner, hunterSocket, runnerSocket } = await startedMatch();
    const attempt = (socket: ClientSocket, runnerId = runner.user.id) =>
      emit(socket, 'catch:attempt', { runnerId });

    // No positions yet
    expect(await attempt(hunterSocket)).toMatchObject({
      ok: false,
      error: { code: 'POSITION_UNKNOWN' },
    });

    // Too far apart (~200 m)
    await emit(hunterSocket, 'location:update', ORIGIN);
    await emit(runnerSocket, 'location:update', metersNorth(200));
    expect(await attempt(hunterSocket)).toMatchObject({
      ok: false,
      error: { code: 'TOO_FAR' },
    });

    // Runners cannot catch
    expect(await attempt(runnerSocket)).toMatchObject({
      ok: false,
      error: { code: 'NOT_A_HUNTER' },
    });

    // Invalid payload
    expect(await attempt(hunterSocket, 'not-a-uuid')).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  it('catching the last runner makes the hunters win', async () => {
    const { match, hunter, runner, hunterSocket, runnerSocket } =
      await startedMatch();

    await emit(hunterSocket, 'location:update', ORIGIN);
    await emit(runnerSocket, 'location:update', metersNorth(5));

    const caught = waitFor(runnerSocket, 'player:caught');
    const finished = waitFor(runnerSocket, 'match:finished');
    const result = await emit(hunterSocket, 'catch:attempt', {
      runnerId: runner.user.id,
    });

    expect(result).toMatchObject({ ok: true, data: { runnersRemaining: 0 } });
    expect(await caught).toMatchObject({
      runnerId: runner.user.id,
      hunterId: hunter.user.id,
    });
    expect(await finished).toMatchObject({
      matchId: match.id,
      winnerTeam: 'HUNTER',
    });

    const final = (await runner.api.get(`/matches/${match.id}`).expect(200))
      .body as MatchDto;
    expect(final).toMatchObject({ status: 'FINISHED', winnerTeam: 'HUNTER' });
    expect(
      final.players.find((p) => p.userId === runner.user.id),
    ).toMatchObject({
      status: 'CAUGHT',
      caughtBy: hunter.user.id,
    });

    // The caught runner can no longer report positions, and nobody has an open match.
    expect(await emit(runnerSocket, 'location:update', ORIGIN)).toMatchObject({
      ok: false,
    });
    await runner.api.get('/matches/current').expect(200, { match: null });
  });

  it('pings reveal the runners to the hunters', async () => {
    const { runner, hunterSocket, runnerSocket, match } =
      await startedMatch(15);
    const hidden = metersNorth(120);
    await emit(runnerSocket, 'location:update', hidden);

    const notice = waitFor(runnerSocket, 'ping:notice', () => true, 25_000);
    const reveal = await waitFor(
      hunterSocket,
      'ping:reveal',
      () => true,
      25_000,
    );
    expect(reveal.runners).toEqual([
      expect.objectContaining({ userId: runner.user.id, ...hidden }),
    ]);
    expect(reveal.nextPingAt).not.toBeNull();
    await notice;

    // Subscribing again (as after a reconnection) restores the latest ping.
    const snapshot = await emit(hunterSocket, 'match:subscribe', {
      matchId: match.id,
    });
    expect(snapshot.ok && snapshot.data.lastPing?.runners).toHaveLength(1);
  }, 40_000);
});
