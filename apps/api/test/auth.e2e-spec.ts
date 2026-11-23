import {
  PASSWORD,
  registration,
  uniqueName,
  useTestApp,
} from './support/test-app.js';

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
});
