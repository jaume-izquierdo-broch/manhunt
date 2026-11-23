import {
  PASSWORD,
  registration,
  uniqueName,
  useTestApp,
} from './support/test-app.js';

describe('auth', () => {
  const t = useTestApp();

  it('registro y /auth/me devuelven usuario y email, nunca la contraseña', async () => {
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

  it('el email se normaliza (espacios y mayúsculas)', async () => {
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

  it('login con usuario o con email (sin distinguir mayúsculas)', async () => {
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

  it('usuario o email repetidos -> 409 con su código', async () => {
    const username = uniqueName('Bea');
    await t
      .anonymous()
      .post('/auth/register', registration(username))
      .expect(201);

    const sameName = await t
      .anonymous()
      .post('/auth/register', {
        ...registration(username.toUpperCase()),
        email: `${uniqueName('otro')}@test.manhunt`,
      })
      .expect(409);
    expect(sameName.body.code).toBe('USERNAME_TAKEN');

    const sameEmail = await t
      .anonymous()
      .post('/auth/register', {
        ...registration(uniqueName('otra')),
        email: `${username}@test.manhunt`,
      })
      .expect(409);
    expect(sameEmail.body.code).toBe('EMAIL_TAKEN');
  });

  it('sin aceptar la política de privacidad no hay registro', async () => {
    const res = await t
      .anonymous()
      .post('/auth/register', {
        ...registration(uniqueName('sin')),
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

  it('rechaza credenciales incorrectas sin decir cuál falla', async () => {
    const res = await t
      .anonymous()
      .post('/auth/login', {
        identifier: uniqueName('nadie'),
        password: PASSWORD,
      })
      .expect(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('valida el cuerpo con los esquemas compartidos', async () => {
    const res = await t
      .anonymous()
      .post('/auth/register', {
        username: 'a',
        email: 'no-es-email',
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

  it('las rutas protegidas exigen token', async () => {
    const res = await t.anonymous().get('/matches/current').expect(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('el WebSocket rechaza conexiones sin token válido', async () => {
    await expect(t.connect('token-falso')).rejects.toThrow('UNAUTHORIZED');
  });
});
