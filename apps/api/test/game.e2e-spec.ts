import type { MatchDto } from '@manhunt/types';
import { type ClientSocket, emit, waitFor } from './support/socket.js';
import { PLAZA, type TestPlayer, useTestApp } from './support/test-app.js';

/** ~0.0001º de latitud ≈ 11 m */
const metersNorth = (meters: number) => ({
  lat: PLAZA.lat + meters / 111_000,
  lng: PLAZA.lng,
});

describe('partida en juego', () => {
  const t = useTestApp();

  interface Setup {
    match: MatchDto;
    hunter: TestPlayer;
    runner: TestPlayer;
    hs: ClientSocket;
    rs: ClientSocket;
  }

  /** Cazador + escapador suscritos y la partida ya en ACTIVE (escondite de 0 s). */
  async function startedMatch(pingIntervalSeconds = 60): Promise<Setup> {
    const hunter = await t.register('cazador');
    const runner = await t.register('escapador');
    const match = (
      await hunter.api
        .post('/matches', {
          playArea: { ...PLAZA, radiusMeters: 500 },
          hidingSeconds: 0,
          durationSeconds: 600,
          pingIntervalSeconds,
        })
        .expect(201)
    ).body as MatchDto;
    await runner.api
      .post('/matches/join', { joinCode: match.joinCode })
      .expect(200);

    const [hs, rs] = await Promise.all([hunter.connect(), runner.connect()]);
    expect((await emit(hs, 'match:subscribe', { matchId: match.id })).ok).toBe(
      true,
    );
    expect((await emit(rs, 'match:subscribe', { matchId: match.id })).ok).toBe(
      true,
    );

    const active = waitFor(rs, 'match:updated', (m) => m.status === 'ACTIVE');
    const started = await hunter.api
      .post(`/matches/${match.id}/start`)
      .expect(200);
    expect((started.body as MatchDto).status).toBe('HIDING');
    await active;

    return { match, hunter, runner, hs, rs };
  }

  it('solo el anfitrión puede empezar y solo una vez', async () => {
    const { match, hunter, runner } = await startedMatch();
    await runner.api.post(`/matches/${match.id}/start`).expect(403);
    const again = await hunter.api
      .post(`/matches/${match.id}/start`)
      .expect(409);
    expect(again.body.code).toBe('INVALID_MATCH_STATUS');
  });

  it('las posiciones llegan en directo solo a los compañeros', async () => {
    const { hs, rs } = await startedMatch();
    let runnerSawHunter = false;
    rs.on('player:position', () => (runnerSawHunter = true));

    const ack = await emit(hs, 'location:update', { ...PLAZA, accuracy: 5 });
    expect(ack.ok).toBe(true);
    await new Promise((r) => setTimeout(r, 300));
    expect(runnerSawHunter).toBe(false);
  });

  it('validaciones de captura', async () => {
    const { runner, hs, rs } = await startedMatch();

    // Sin posiciones
    expect(
      await emit(hs, 'catch:attempt', { runnerId: runner.user.id }),
    ).toMatchObject({
      ok: false,
      error: { code: 'POSITION_UNKNOWN' },
    });

    // Demasiado lejos (~200 m)
    await emit(hs, 'location:update', PLAZA);
    await emit(rs, 'location:update', metersNorth(200));
    expect(
      await emit(hs, 'catch:attempt', { runnerId: runner.user.id }),
    ).toMatchObject({
      ok: false,
      error: { code: 'TOO_FAR' },
    });

    // Un escapador no captura
    expect(
      await emit(rs, 'catch:attempt', { runnerId: runner.user.id }),
    ).toMatchObject({
      ok: false,
      error: { code: 'NOT_A_HUNTER' },
    });

    // Payload inválido
    expect(
      await emit(hs, 'catch:attempt', { runnerId: 'no-es-uuid' }),
    ).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  it('capturar al último escapador da la victoria a los cazadores', async () => {
    const { match, hunter, runner, hs, rs } = await startedMatch();

    await emit(hs, 'location:update', PLAZA);
    await emit(rs, 'location:update', metersNorth(5));

    const caught = waitFor(rs, 'player:caught');
    const finished = waitFor(rs, 'match:finished');
    const result = await emit(hs, 'catch:attempt', {
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

    // El capturado ya no puede enviar posición y nadie tiene partida abierta
    expect(await emit(rs, 'location:update', PLAZA)).toMatchObject({
      ok: false,
    });
    await runner.api.get('/matches/current').expect(200, { match: null });
  });

  it('los pings revelan a los escapadores a los cazadores', async () => {
    const { runner, hs, rs, match } = await startedMatch(15);
    const hidden = metersNorth(120);
    await emit(rs, 'location:update', hidden);

    const notice = waitFor(rs, 'ping:notice', () => true, 25_000);
    const reveal = await waitFor(hs, 'ping:reveal', () => true, 25_000);
    expect(reveal.runners).toEqual([
      expect.objectContaining({ userId: runner.user.id, ...hidden }),
    ]);
    expect(reveal.nextPingAt).not.toBeNull();
    await notice;

    // Al re-suscribirse (reconexión), el cazador recupera el último ping
    const snapshot = await emit(hs, 'match:subscribe', { matchId: match.id });
    expect(snapshot.ok && snapshot.data.lastPing?.runners).toHaveLength(1);
  }, 40_000);
});
