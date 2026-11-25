import { resolveApiUrl } from './config';

describe('resolveApiUrl', () => {
  it('uses EXPO_PUBLIC_API_URL when set, without a trailing slash', () => {
    expect(
      resolveApiUrl({
        envUrl: 'https://api.manhunt.app/',
        port: 3000,
        hostUri: '192.168.1.20:8081',
        platform: 'ios',
      }),
    ).toBe('https://api.manhunt.app');
  });

  it('in development, points at the machine serving Metro', () => {
    expect(
      resolveApiUrl({
        port: 3100,
        hostUri: '192.168.1.20:8081',
        platform: 'android',
      }),
    ).toBe('http://192.168.1.20:3100');
  });

  it('ignores the host of an Expo tunnel', () => {
    expect(
      resolveApiUrl({
        port: 3000,
        hostUri: 'abc-anonymous-8081.exp.direct',
        platform: 'ios',
      }),
    ).toBe('http://localhost:3000');
  });

  it('without Metro: 10.0.2.2 on Android, localhost on iOS', () => {
    expect(resolveApiUrl({ port: 3000, platform: 'android' })).toBe(
      'http://10.0.2.2:3000',
    );
    expect(resolveApiUrl({ port: 3000, platform: 'ios' })).toBe(
      'http://localhost:3000',
    );
  });
});
