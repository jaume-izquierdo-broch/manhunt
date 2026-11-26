import type { MatchDto } from '@manhunt/types';
import { emit, waitFor } from './support/socket.js';
import {
  metersNorth,
  ORIGIN,
  type TestPlayer,
  useTestApp,
} from './support/test-app.js';

describe('lobby (LOBBY)', () => {
  const t = useTestApp();

  async function createMatch(host: TestPlayer): Promise<MatchDto> {
    const res = await host.api.post('/lobbies', {}).expect(201);
    return res.body as MatchDto;
  }

  it('creates a match with defaults; the host joins as a hunter', async () => {
    const host = await t.register('host');
    const match = await createMatch(host);

    expect(match).toMatchObject({
      status: 'LOBBY',
      hostId: host.user.id,
      radiusMeters: 600,
      playArea: null,
      hidingSeconds: 180,
      durationSeconds: 3600,
      pingIntervalSeconds: 180,
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

  it('joining by code notifies the lobby and is idempotent', async () => {
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
      .post('/lobbies/join', { joinCode: match.joinCode.toLowerCase() })
      .expect(200);
    expect((joined.body as MatchDto).players[1]).toMatchObject({
      userId: guest.user.id,
      team: 'RUNNER',
    });
    await updated;

    const again = await guest.api
      .post('/lobbies/join', { joinCode: match.joinCode })
      .expect(200);
    expect((again.body as MatchDto).players).toHaveLength(2);
  });

  it('a user cannot be in two matches at once', async () => {
    const host = await t.register('host');
    await createMatch(host);
    const res = await host.api.post('/lobbies', {}).expect(409);
    expect(res.body).toMatchObject({ code: 'ALREADY_IN_MATCH' });
  });

  it('an unknown code returns 404', async () => {
    const guest = await t.register('guest');
    const res = await guest.api
      .post('/lobbies/join', { joinCode: 'ZZZZZZ' })
      .expect(404);
    expect(res.body.code).toBe('LOBBY_NOT_FOUND');
  });

  it('only participants can see a match', async () => {
    const host = await t.register('host');
    const outsider = await t.register('outsider');
    const match = await createMatch(host);
    const res = await outsider.api.get(`/matches/${match.id}`).expect(403);
    expect(res.body.code).toBe('NOT_IN_MATCH');
  });

  it('the host can change teams and kick players; others cannot', async () => {
    const host = await t.register('host');
    const guest = await t.register('guest');
    const match = await createMatch(host);
    await guest.api
      .post('/lobbies/join', { joinCode: match.joinCode })
      .expect(200);

    const forbidden = await guest.api
      .patch(`/lobbies/${match.id}/players/${host.user.id}`, { team: 'RUNNER' })
      .expect(403);
    expect(forbidden.body.code).toBe('NOT_HOST');

    const changed = await host.api
      .patch(`/lobbies/${match.id}/players/${guest.user.id}`, {
        team: 'HUNTER',
      })
      .expect(200);
    expect(
      (changed.body as MatchDto).players.every((p) => p.team === 'HUNTER'),
    ).toBe(true);

    const guestSocket = await guest.connect();
    const closed = waitFor(guestSocket, 'match:closed');
    const afterKick = await host.api
      .delete(`/lobbies/${match.id}/players/${guest.user.id}`)
      .expect(200);
    expect((afterKick.body as MatchDto).players).toHaveLength(1);
    expect(await closed).toEqual({ matchId: match.id });
  });

  it('players can leave; the host must close the lobby instead', async () => {
    const host = await t.register('host');
    const guest = await t.register('guest');
    const match = await createMatch(host);
    await guest.api
      .post('/lobbies/join', { joinCode: match.joinCode })
      .expect(200);

    await guest.api.post(`/lobbies/${match.id}/leave`).expect(204);
    await guest.api.get('/matches/current').expect(200, { match: null });

    const res = await host.api.post(`/lobbies/${match.id}/leave`).expect(409);
    expect(res.body.code).toBe('HOST_CANNOT_LEAVE');

    await host.api.delete(`/lobbies/${match.id}`).expect(204);
    await host.api.get(`/matches/${match.id}`).expect(404);
  });

  it('cannot start without at least one hunter and one runner', async () => {
    const host = await t.register('host');
    const match = await createMatch(host);
    const res = await host.api
      .post(`/matches/${match.id}/start`, ORIGIN)
      .expect(409);
    expect(res.body.code).toBe('TEAMS_UNBALANCED');
  });

  it('only the host changes the settings, and everyone is told', async () => {
    const host = await t.register('host');
    const guest = await t.register('guest');
    const match = await createMatch(host);
    await guest.api
      .post('/lobbies/join', { joinCode: match.joinCode })
      .expect(200);
    const socket = await guest.connect();
    await emit(socket, 'match:subscribe', { matchId: match.id });

    const settings = {
      radiusMeters: 800,
      hidingSeconds: 60,
      durationSeconds: 1200,
      pingIntervalSeconds: 30,
    };
    await guest.api
      .patch(`/lobbies/${match.id}/settings`, settings)
      .expect(403);
    const updated = waitFor(
      socket,
      'match:updated',
      (m) => m.radiusMeters === 800,
    );
    const res = await host.api
      .patch(`/lobbies/${match.id}/settings`, settings)
      .expect(200);

    expect(res.body).toMatchObject(settings);
    await updated;
  });

  it('refuses a hunt too short for three pings', async () => {
    const host = await t.register('host');
    const match = await createMatch(host);

    const res = await host.api
      .patch(`/lobbies/${match.id}/settings`, {
        radiusMeters: 600,
        hidingSeconds: 180,
        durationSeconds: 1200,
        pingIntervalSeconds: 600,
      })
      .expect(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('accepts a town-sized match', async () => {
    const host = await t.register('host');
    const match = await createMatch(host);

    const settings = {
      radiusMeters: 10_000,
      hidingSeconds: 3600,
      durationSeconds: 3 * 3600,
      pingIntervalSeconds: 900,
    };
    const res = await host.api
      .patch(`/lobbies/${match.id}/settings`, settings)
      .expect(200);
    expect(res.body).toMatchObject(settings);
  });

  describe('starting where the host is', () => {
    async function lobbyWithGuest() {
      const host = await t.register('host');
      const guest = await t.register('guest');
      const match = await createMatch(host);
      await guest.api
        .post('/lobbies/join', { joinCode: match.joinCode })
        .expect(200);
      const [hostSocket, guestSocket] = await Promise.all([
        host.connect(),
        guest.connect(),
      ]);
      for (const socket of [hostSocket, guestSocket]) {
        await emit(socket, 'match:subscribe', { matchId: match.id });
      }
      return { host, guest, match, hostSocket, guestSocket };
    }

    it("shows each player's distance to the host in the lobby", async () => {
      const { match, hostSocket, guestSocket } = await lobbyWithGuest();

      await emit(hostSocket, 'location:update', ORIGIN);
      const located = waitFor(hostSocket, 'match:updated', (m) =>
        m.players.some((p) => p.lobbyLocation?.distanceFromHostMeters != null),
      );
      await emit(guestSocket, 'location:update', metersNorth(120));

      const guest = (await located).players.find(
        (p) => p.userId !== match.hostId,
      );
      expect(guest?.lobbyLocation?.distanceFromHostMeters).toBeCloseTo(120, -1);
    });

    it('refuses to start while a player has no location', async () => {
      const { host, guest, match } = await lobbyWithGuest();

      const res = await host.api
        .post(`/matches/${match.id}/start`, ORIGIN)
        .expect(409);
      expect(res.body.code).toBe('PLAYERS_NOT_READY');
      expect(res.body.message).toContain(
        `${guest.user.username} has no location`,
      );
    });

    it('refuses to start while a player is outside the area', async () => {
      const { host, guest, match, guestSocket } = await lobbyWithGuest();
      await emit(guestSocket, 'location:update', metersNorth(1000));

      const res = await host.api
        .post(`/matches/${match.id}/start`, ORIGIN)
        .expect(409);
      expect(res.body.code).toBe('PLAYERS_NOT_READY');
      expect(res.body.message).toContain(
        `${guest.user.username} is 1002 m away`,
      );
    });

    it('refuses an imprecise host location', async () => {
      const { host, match, guestSocket } = await lobbyWithGuest();
      await emit(guestSocket, 'location:update', ORIGIN);

      const res = await host.api
        .post(`/matches/${match.id}/start`, { ...ORIGIN, accuracy: 500 })
        .expect(409);
      expect(res.body.code).toBe('LOCATION_INACCURATE');
    });

    it('centers the play area on the host', async () => {
      const { host, match, guestSocket } = await lobbyWithGuest();
      await emit(guestSocket, 'location:update', metersNorth(100));

      const res = await host.api
        .post(`/matches/${match.id}/start`, { ...ORIGIN, accuracy: 10 })
        .expect(200);
      expect((res.body as MatchDto).playArea).toEqual({
        ...ORIGIN,
        radiusMeters: 600,
      });
    });
  });
});
