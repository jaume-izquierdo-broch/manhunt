import { DUMMY_HASH, hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('verifica la contraseña correcta y rechaza la incorrecta', async () => {
    const hash = await hashPassword('super-secreta');
    expect(hash.startsWith('scrypt$')).toBe(true);
    await expect(verifyPassword('super-secreta', hash)).resolves.toBe(true);
    await expect(verifyPassword('otra', hash)).resolves.toBe(false);
  });

  it('usa una sal distinta cada vez', async () => {
    const [a, b] = await Promise.all([
      hashPassword('x'.repeat(8)),
      hashPassword('x'.repeat(8)),
    ]);
    expect(a).not.toBe(b);
  });

  it('nunca da por buena una contraseña contra el hash de relleno', async () => {
    await expect(verifyPassword('loquesea', DUMMY_HASH)).resolves.toBe(false);
  });

  it('rechaza hashes con formato desconocido', async () => {
    await expect(verifyPassword('x', 'bcrypt$abc')).resolves.toBe(false);
  });
});
