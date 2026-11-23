import { resolveApiUrl } from './config';

describe('resolveApiUrl', () => {
  it('usa EXPO_PUBLIC_API_URL si existe (sin barra final)', () => {
    expect(
      resolveApiUrl({
        envUrl: 'https://api.manhunt.app/',
        port: 3000,
        hostUri: '192.168.1.20:8081',
        platform: 'ios',
      }),
    ).toBe('https://api.manhunt.app');
  });

  it('en desarrollo apunta a la IP del ordenador que sirve Metro', () => {
    expect(
      resolveApiUrl({
        port: 3100,
        hostUri: '192.168.1.20:8081',
        platform: 'android',
      }),
    ).toBe('http://192.168.1.20:3100');
  });

  it('ignora el host de un túnel de Expo', () => {
    expect(
      resolveApiUrl({
        port: 3000,
        hostUri: 'abc-anonymous-8081.exp.direct',
        platform: 'ios',
      }),
    ).toBe('http://localhost:3000');
  });

  it('sin Metro: 10.0.2.2 en Android y localhost en el resto', () => {
    expect(resolveApiUrl({ port: 3000, platform: 'android' })).toBe(
      'http://10.0.2.2:3000',
    );
    expect(resolveApiUrl({ port: 3000, platform: 'web' })).toBe(
      'http://localhost:3000',
    );
  });
});
