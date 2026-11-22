import { loadEnv, parseCorsOrigin } from './env.js';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'a'.repeat(32),
};

describe('loadEnv', () => {
  it('aplica valores por defecto', () => {
    const env = loadEnv(base);
    expect(env.PORT).toBe(3000);
    expect(env.REDIS_HOST).toBe('localhost');
    expect(env.RUN_MIGRATIONS).toBe(true);
    expect(env.CATCH_RADIUS_METERS).toBe(25);
  });

  it('convierte números y booleanos desde texto', () => {
    const env = loadEnv({ ...base, PORT: '8080', RUN_MIGRATIONS: 'false' });
    expect(env.PORT).toBe(8080);
    expect(env.RUN_MIGRATIONS).toBe(false);
  });

  it('falla con un JWT_SECRET corto', () => {
    expect(() => loadEnv({ ...base, JWT_SECRET: 'corto' })).toThrow(
      /JWT_SECRET/,
    );
  });

  it('falla si falta DATABASE_URL', () => {
    expect(() => loadEnv({ JWT_SECRET: base.JWT_SECRET })).toThrow(
      /DATABASE_URL/,
    );
  });
});

describe('parseCorsOrigin', () => {
  it('"*" permite cualquier origen', () => {
    expect(parseCorsOrigin('*')).toBe(true);
  });

  it('separa una lista por comas', () => {
    expect(parseCorsOrigin('https://a.com, https://b.com')).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });
});
