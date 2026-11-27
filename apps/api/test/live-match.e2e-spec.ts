import type { MatchDto, PingRevealPayload } from '@manhunt/types';
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
    /** Every ping the hunter gets, from the start (the first comes as the hunt begins). */
    reveals: PingRevealPayload[];
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

    const reveals: PingRevealPayload[] = [];
    hunterSocket.on('ping:reveal', (ping) => reveals.push(ping));
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

    return { match, hunter, runner, hunterSocket, runnerSocket, reveals };
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

    const claimed = waitFor(runnerSocket, 'catch:claimed');
    const caught = waitFor(runnerSocket, 'player:caught');
    const finished = waitFor(runnerSocket, 'match:finished');
    const result = await emit(hunterSocket, 'catch:attempt', {
      runnerId: runner.user.id,
    });
    expect(result).toMatchObject({
      ok: true,
      data: { runnerId: runner.user.id, hunterId: hunter.user.id },
    });

    // The catch waits for the runner, who confirms it.
    expect(await claimed).toMatchObject({ hunterId: hunter.user.id });
    expect(await emit(runnerSocket, 'catch:answer', { caught: true })).toEqual({
      ok: true,
      data: null,
    });
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

  it('a runner can say they were not caught', async () => {
    const { match, hunter, runner, hunterSocket, runnerSocket } =
      await startedMatch();
    await emit(hunterSocket, 'location:update', ORIGIN);
    await emit(runnerSocket, 'location:update', metersNorth(5));
    const attempt = () =>
      emit(hunterSocket, 'catch:attempt', { runnerId: runner.user.id });

    // Nothing to answer yet
    expect(
      await emit(runnerSocket, 'catch:answer', { caught: false }),
    ).toMatchObject({ ok: false, error: { code: 'NO_CATCH_TO_ANSWER' } });

    expect(await attempt()).toMatchObject({ ok: true });
    // One catch at a time per runner
    expect(await attempt()).toMatchObject({
      ok: false,
      error: { code: 'CATCH_PENDING' },
    });

    const rejected = waitFor(hunterSocket, 'catch:rejected');
    await emit(runnerSocket, 'catch:answer', { caught: false });
    expect(await rejected).toEqual({
      matchId: match.id,
      runnerId: runner.user.id,
    });
    const after = (await hunter.api.get(`/matches/${match.id}`).expect(200))
      .body as MatchDto;
    expect(after.players.find((p) => p.userId === runner.user.id)?.status).toBe(
      'ALIVE',
    );

    // The hunter can try again
    expect(await attempt()).toMatchObject({ ok: true });
  });

  it('a catch the runner does not answer counts after a while', async () => {
    const { match, runner, hunterSocket, runnerSocket } = await startedMatch();
    await emit(hunterSocket, 'location:update', ORIGIN);
    await emit(runnerSocket, 'location:update', metersNorth(5));

    const caught = waitFor(hunterSocket, 'player:caught', () => true, 30_000);
    const claim = await emit(hunterSocket, 'catch:attempt', {
      runnerId: runner.user.id,
    });
    expect(claim.ok).toBe(true);

    // Reconnecting brings the question back.
    const snapshot = await emit(runnerSocket, 'match:subscribe', {
      matchId: match.id,
    });
    expect(snapshot.ok && snapshot.data.pendingCatch).toEqual(
      claim.ok && claim.data,
    );

    expect(await caught).toMatchObject({ runnerId: runner.user.id });
  }, 40_000);

  it('the host can end the match; nobody wins', async () => {
    const { match, hunter, runner, runnerSocket } = await startedMatch();

    const forbidden = await runner.api
      .post(`/matches/${match.id}/end`)
      .expect(403);
    expect(forbidden.body.code).toBe('NOT_HOST');

    const finished = waitFor(runnerSocket, 'match:finished');
    const ended = await hunter.api.post(`/matches/${match.id}/end`).expect(200);
    expect(ended.body).toMatchObject({ status: 'FINISHED', winnerTeam: null });
    expect(await finished).toMatchObject({
      matchId: match.id,
      winnerTeam: null,
    });

    await hunter.api.post(`/matches/${match.id}/end`).expect(409);
  });

  it('pings reveal the runners to the hunters, the first as the hunt begins', async () => {
    const { runner, hunterSocket, runnerSocket, match, reveals } =
      await startedMatch(15);

    await vi.waitFor(() => expect(reveals).toHaveLength(1));
    expect(reveals[0]?.runners).toEqual([
      expect.objectContaining({ userId: runner.user.id, ...ORIGIN }),
    ]);

    const hidden = metersNorth(120);
    await emit(runnerSocket, 'location:update', hidden);
    const notice = waitFor(runnerSocket, 'ping:notice', () => true, 25_000);
    await vi.waitFor(() => expect(reveals).toHaveLength(2), {
      timeout: 25_000,
      interval: 200,
    });
    expect(reveals[1]?.runners).toEqual([
      expect.objectContaining({ userId: runner.user.id, ...hidden }),
    ]);
    expect(reveals[1]?.nextPingAt).not.toBeNull();
    await notice;

    // Subscribing again (as after a reconnection) restores the latest ping.
    const snapshot = await emit(hunterSocket, 'match:subscribe', {
      matchId: match.id,
    });
    expect(snapshot.ok && snapshot.data.lastPing?.runners).toHaveLength(1);
  }, 40_000);
});
