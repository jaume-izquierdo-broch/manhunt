import { useTestApp } from './support/test-app.js';

describe('health', () => {
  const t = useTestApp();

  it('GET /health comprueba Postgres y Redis', async () => {
    const res = await t.anonymous().get('/health').expect(200);
    expect(res.body).toEqual({
      status: 'ok',
      checks: { database: 'up', redis: 'up' },
    });
  });

  it('GET /health/live responde siempre', async () => {
    await t.anonymous().get('/health/live').expect(200, { status: 'ok' });
  });
});
