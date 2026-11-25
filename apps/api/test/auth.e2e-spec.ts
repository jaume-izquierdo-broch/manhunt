import type { ClientSocket } from './support/socket.js';
import {
  PASSWORD,
  registration,
  uniqueName,
  useTestApp,
} from './support/test-app.js';

/** Resolves when the server closes the socket. */
const serverDisconnect = (socket: ClientSocket) =>
  new Promise<string>((resolve) => socket.once('disconnect', resolve));

describe('auth', () => {
  const t = useTestApp();

  it('register and /auth/me return the user with their email, never the password', async () => {
    const username = uniqueName('ana');
    const res = await t
      .anonymous()
      .post('/auth/register', registration(username))
      .expect(201);
    expect(res.body.user).toEqual({
      id: expect.any(String),
      username,
      email: `${username}@test.manhunt`,
      createdAt: expect.any(String),
    });

    const me = await t
      .anonymous()
      .get('/auth/me')
      .set('Authorization', `Bearer ${res.body.accessToken}`)
      .expect(200);
    expect(me.body).toEqual(res.body.user);
  });

  it('normalizes the email (whitespace and case)', async () => {
    const username = uniqueName('eva');
    const res = await t
      .anonymous()
      .post('/auth/register', {
        ...registration(username),
        email: `  ${username.toUpperCase()}@Test.Manhunt `,
      })
      .expect(201);
    expect(res.body.user.email).toBe(`${username}@test.manhunt`);
  });

  it('logs in with the username or the email, case-insensitively', async () => {
    const username = uniqueName('Leo');
    await t
      .anonymous()
      .post('/auth/register', registration(username))
      .expect(201);

    for (const identifier of [
      username,
      username.toLowerCase(),
      `${username}@test.manhunt`.toUpperCase(),
    ]) {
      await t
        .anonymous()
        .post('/auth/login', { identifier, password: PASSWORD })
        .expect(200);
    }
  });

  it('rejects a taken username or email with its own error code', async () => {
    const username = uniqueName('Bea');
    await t
      .anonymous()
      .post('/auth/register', registration(username))
      .expect(201);

    const sameName = await t
      .anonymous()
      .post('/auth/register', {
        ...registration(username.toUpperCase()),
        email: `${uniqueName('other')}@test.manhunt`,
      })
      .expect(409);
    expect(sameName.body.code).toBe('USERNAME_TAKEN');

    const sameEmail = await t
      .anonymous()
      .post('/auth/register', {
        ...registration(uniqueName('another')),
        email: `${username}@test.manhunt`,
      })
      .expect(409);
    expect(sameEmail.body.code).toBe('EMAIL_TAKEN');
  });

  it('refuses to register without accepting the privacy policy', async () => {
    const res = await t
      .anonymous()
      .post('/auth/register', {
        ...registration(uniqueName('noterms')),
        acceptTerms: false,
      })
      .expect(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'acceptTerms' }),
      ]),
    );
  });

  it('rejects wrong credentials without saying which part is wrong', async () => {
    const res = await t
      .anonymous()
      .post('/auth/login', {
        identifier: uniqueName('nobody'),
        password: PASSWORD,
      })
      .expect(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('validates the body with the shared schemas', async () => {
    const res = await t
      .anonymous()
      .post('/auth/register', {
        username: 'a',
        email: 'not-an-email',
        password: '1',
        acceptTerms: true,
      })
      .expect(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    const paths = (res.body.details as { path: string }[]).map((d) => d.path);
    expect(paths).toEqual(
      expect.arrayContaining(['username', 'email', 'password']),
    );
  });

  it('protected routes require a token', async () => {
    const res = await t.anonymous().get('/matches/current').expect(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('the WebSocket rejects connections without a valid token', async () => {
    await expect(t.connect('fake-token')).rejects.toThrow('UNAUTHORIZED');
  });

  describe('sessions', () => {
    /** The same user logs in again, as if from another device. */
    async function loginAgain(username: string): Promise<string> {
      const res = await t
        .anonymous()
        .post('/auth/login', { identifier: username, password: PASSWORD })
        .expect(200);
      return res.body.accessToken as string;
    }

    const me = (token: string) =>
      t.anonymous().get('/auth/me').set('Authorization', `Bearer ${token}`);

    it('logout revokes the token and closes its sockets', async () => {
      const player = await t.register('out');
      const socket = await player.connect();
      const closed = serverDisconnect(socket);

      await player.api.post('/auth/logout').expect(204);

      await expect(closed).resolves.toBe('io server disconnect');
      const revoked = await me(player.accessToken).expect(401);
      expect(revoked.body.code).toBe('UNAUTHORIZED');
      await expect(t.connect(player.accessToken)).rejects.toThrow(
        'UNAUTHORIZED',
      );
    });

    it('one device at a time: logging in elsewhere ends the old session', async () => {
      const phone = await t.register('dev');
      const phoneSocket = await phone.connect();
      const closed = serverDisconnect(phoneSocket);

      const tabletToken = await loginAgain(phone.user.username);

      // The phone is kicked out of any match and its token stops working.
      await expect(closed).resolves.toBe('io server disconnect');
      await me(phone.accessToken).expect(401);
      // The tablet works normally.
      await me(tabletToken).expect(200);
      const tabletSocket = await t.connect(tabletToken);
      expect(tabletSocket.connected).toBe(true);
    });

    it('does not touch other users', async () => {
      const [a, b] = await Promise.all([t.register('a'), t.register('b')]);
      await loginAgain(a.user.username);
      await a.api.post('/auth/logout').expect(401);
      await me(b.accessToken).expect(200);
    });

    it('logout needs a valid session', async () => {
      await t.anonymous().post('/auth/logout').expect(401);
    });
  });
});
