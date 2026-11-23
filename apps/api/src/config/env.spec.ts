import { loadEnv, parseCorsOrigin } from './env.js';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
};

describe('loadEnv', () => {
  it('applies defaults', () => {
    const env = loadEnv(base);
    expect(env.PORT).toBe(3000);
    expect(env.REDIS_HOST).toBe('localhost');
    expect(env.RUN_MIGRATIONS).toBe(true);
    expect(env.CATCH_RADIUS_METERS).toBe(25);
    expect(env.SESSION_TTL_SECONDS).toBe(30 * 24 * 60 * 60);
  });

  it('coerces numbers and booleans from strings', () => {
    const env = loadEnv({ ...base, PORT: '8080', RUN_MIGRATIONS: 'false' });
    expect(env.PORT).toBe(8080);
    expect(env.RUN_MIGRATIONS).toBe(false);
  });

  it('fails on a non-positive SESSION_TTL_SECONDS', () => {
    expect(() => loadEnv({ ...base, SESSION_TTL_SECONDS: '0' })).toThrow(
      /SESSION_TTL_SECONDS/,
    );
  });

  it('fails without DATABASE_URL', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
  });
});

describe('parseCorsOrigin', () => {
  it('"*" allows every origin', () => {
    expect(parseCorsOrigin('*')).toBe(true);
  });

  it('splits a comma-separated list', () => {
    expect(parseCorsOrigin('https://a.com, https://b.com')).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });
});
