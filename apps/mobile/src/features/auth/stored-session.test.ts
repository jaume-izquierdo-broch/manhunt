import { parseStoredSession } from './stored-session';

const valid = {
  accessToken: 'token',
  user: {
    id: 'u1',
    username: 'ana',
    email: 'ana@example.com',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
};

describe('parseStoredSession', () => {
  it('returns the stored session', () => {
    expect(parseStoredSession(JSON.stringify(valid))).toEqual(valid);
  });

  it('ignores empty, corrupt or incomplete values', () => {
    expect(parseStoredSession(null)).toBeNull();
    expect(parseStoredSession('{not json')).toBeNull();
    expect(
      parseStoredSession(JSON.stringify({ accessToken: 'token' })),
    ).toBeNull();
  });
});
