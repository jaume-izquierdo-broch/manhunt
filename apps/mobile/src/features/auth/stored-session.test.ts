import { parseStoredSession } from './stored-session';

const valid = {
  accessToken: 'tok',
  user: { id: 'u1', username: 'ana', createdAt: '2026-01-01T00:00:00.000Z' },
};

describe('parseStoredSession', () => {
  it('devuelve la sesión guardada', () => {
    expect(parseStoredSession(JSON.stringify(valid))).toEqual(valid);
  });

  it('ignora valores vacíos, corruptos o incompletos', () => {
    expect(parseStoredSession(null)).toBeNull();
    expect(parseStoredSession('{no es json')).toBeNull();
    expect(
      parseStoredSession(JSON.stringify({ accessToken: 'tok' })),
    ).toBeNull();
  });
});
