import { DUMMY_HASH, hashPassword, verifyPassword } from './password.js';

describe('password hashing', () => {
  it('accepts the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('super-secret');
    expect(hash.startsWith('scrypt$')).toBe(true);
    await expect(verifyPassword('super-secret', hash)).resolves.toBe(true);
    await expect(verifyPassword('another-one', hash)).resolves.toBe(false);
  });

  it('uses a different salt every time', async () => {
    const [a, b] = await Promise.all([
      hashPassword('x'.repeat(8)),
      hashPassword('x'.repeat(8)),
    ]);
    expect(a).not.toBe(b);
  });

  it('never matches the dummy hash', async () => {
    await expect(verifyPassword('anything', DUMMY_HASH)).resolves.toBe(false);
  });

  it('rejects hashes in an unknown format', async () => {
    await expect(verifyPassword('x', 'bcrypt$abc')).resolves.toBe(false);
  });
});
