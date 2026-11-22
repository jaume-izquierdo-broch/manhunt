import type { MatchDto } from '@manhunt/types';
import { emit, waitFor } from './support/socket.js';
import { PLAZA, type TestPlayer, useTestApp } from './support/test-app.js';

describe('sala (WAITING)', () => {
  const t = useTestApp();

  async function createMatch(host: TestPlayer): Promise<MatchDto> {
    const res = await host.api
      .post('/matches', { playArea: { ...PLAZA, radiusMeters: 300 } })
      .expect(201);
    return res.body as MatchDto;
  }

  it('crear con valores por defecto: el anfitrión entra como cazador', async () => {
    const host = await t.register('host');
    const match = await createMatch(host);

    expect(match).toMatchObject({
      status: 'WAITING',
      hostId: host.user.id,
      hidingSeconds: 120,
      durationSeconds: 1800,
      pingIntervalSeconds: 120,
    });
    expect(match.joinCode).toMatch(/^[A-Z2-9]{6}$/);
    expect(match.players).toEqual([
      expect.objectContaining({
        userId: host.user.id,
        team: 'HUNTER',
        status: 'ALIVE',
      }),
    ]);

    await host.api.get('/matches/current').expect(200, { match });
  });

  it('unirse con el código avisa a la sala y es idempotente', async () => {
    const host = await t.register('host');
    const guest = await t.register('guest');
    const match = await createMatch(host);

    const socket = await host.connect();
    await emit(socket, 'match:subscribe', { matchId: match.id });
    const updated = waitFor(
      socket,
      'match:updated',
      (m) => m.players.length === 2,
    );

    const joined = await guest.api
      .post('/matches/join', { joinCode: match.joinCode.toLowerCase() })
      .expect(200);
    expect((joined.body as MatchDto).players[1]).toMatchObject({
      userId: guest.user.id,
      team: 'RUNNER',
    });
    await updated;

    // Repetir no duplica
    const again = await guest.api
      .post('/matches/join', { joinCode: match.joinCode })
      .expect(200);
    expect((again.body as MatchDto).players).toHaveLength(2);
  });

  it('no se puede estar en dos partidas a la vez', async () => {
    const host = await t.register('host');
    await createMatch(host);
    const res = await host.api
      .post('/matches', { playArea: { ...PLAZA, radiusMeters: 300 } })
      .expect(409);
    expect(res.body).toMatchObject({ code: 'ALREADY_IN_MATCH' });
  });

  it('código inexistente -> 404', async () => {
    const guest = await t.register('guest');
    const res = await guest.api
      .post('/matches/join', { joinCode: 'ZZZZZZ' })
      .expect(404);
    expect(res.body.code).toBe('MATCH_NOT_FOUND');
  });

  it('solo los participantes pueden ver la partida', async () => {
    const host = await t.register('host');
    const outsider = await t.register('outsider');
    const match = await createMatch(host);
    const res = await outsider.api.get(`/matches/${match.id}`).expect(403);
    expect(res.body.code).toBe('NOT_IN_MATCH');
  });

  it('el anfitrión cambia equipos y expulsa; los demás no', async () => {
    const host = await t.register('host');
    const guest = await t.register('guest');
    const match = await createMatch(host);
    await guest.api
      .post('/matches/join', { joinCode: match.joinCode })
      .expect(200);

    const forbidden = await guest.api
      .patch(`/matches/${match.id}/players/${host.user.id}`, { team: 'RUNNER' })
      .expect(403);
    expect(forbidden.body.code).toBe('NOT_HOST');

    const changed = await host.api
      .patch(`/matches/${match.id}/players/${guest.user.id}`, {
        team: 'HUNTER',
      })
      .expect(200);
    expect(
      (changed.body as MatchDto).players.every((p) => p.team === 'HUNTER'),
    ).toBe(true);

    const guestSocket = await guest.connect();
    const closed = waitFor(guestSocket, 'match:closed');
    const afterKick = await host.api
      .delete(`/matches/${match.id}/players/${guest.user.id}`)
      .expect(200);
    expect((afterKick.body as MatchDto).players).toHaveLength(1);
    expect(await closed).toEqual({ matchId: match.id });
  });

  it('un jugador puede salir; el anfitrión no (debe cerrar la sala)', async () => {
    const host = await t.register('host');
    const guest = await t.register('guest');
    const match = await createMatch(host);
    await guest.api
      .post('/matches/join', { joinCode: match.joinCode })
      .expect(200);

    await guest.api.post(`/matches/${match.id}/leave`).expect(204);
    await guest.api.get('/matches/current').expect(200, { match: null });

    const res = await host.api.post(`/matches/${match.id}/leave`).expect(409);
    expect(res.body.code).toBe('HOST_CANNOT_LEAVE');

    await host.api.delete(`/matches/${match.id}`).expect(204);
    await host.api.get(`/matches/${match.id}`).expect(404);
  });

  it('no se puede empezar sin al menos un cazador y un escapador', async () => {
    const host = await t.register('host');
    const match = await createMatch(host);
    const res = await host.api.post(`/matches/${match.id}/start`).expect(409);
    expect(res.body.code).toBe('TEAMS_UNBALANCED');
  });
});
