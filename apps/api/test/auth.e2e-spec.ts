import { PASSWORD, uniqueName, useTestApp } from './support/test-app.js';

describe('auth', () => {
  const t = useTestApp();

  it('registro, login y /auth/me', async () => {
    const username = uniqueName('ana');
    await t
      .anonymous()
      .post('/auth/register', { username, password: PASSWORD })
      .expect(201);

    const login = await t
      .anonymous()
      .post('/auth/login', { username, password: PASSWORD })
      .expect(200);

    const me = await t
      .anonymous()
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(me.body).toMatchObject({ username });
    expect(me.body).not.toHaveProperty('passwordHash');
  });

  it('el nombre de usuario no distingue mayúsculas', async () => {
    const username = uniqueName('Bea');
    await t
      .anonymous()
      .post('/auth/register', { username, password: PASSWORD })
      .expect(201);

    const dup = await t
      .anonymous()
      .post('/auth/register', {
        username: username.toUpperCase(),
        password: PASSWORD,
      })
      .expect(409);
    expect(dup.body.code).toBe('USERNAME_TAKEN');

    await t
      .anonymous()
      .post('/auth/login', {
        username: username.toLowerCase(),
        password: PASSWORD,
      })
      .expect(200);
  });

  it('rechaza credenciales incorrectas', async () => {
    const res = await t
      .anonymous()
      .post('/auth/login', {
        username: uniqueName('nadie'),
        password: PASSWORD,
      })
      .expect(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('valida el cuerpo con los esquemas compartidos', async () => {
    const res = await t
      .anonymous()
      .post('/auth/register', { username: 'a', password: '1' })
      .expect(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'username' })]),
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
