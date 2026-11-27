import { clockOffsetMs, formatCountdown, msUntil, nextPingTime } from './time';

describe('nextPingTime', () => {
  const match = {
    status: 'ACTIVE',
    hidingEndsAt: '2026-01-01T10:02:00.000Z',
    endsAt: '2026-01-01T10:12:00.000Z',
    pingIntervalSeconds: 180,
  };
  const at = (iso: string) => Date.parse(iso);

  it('after the ping at the start of the hunt, the next comes one interval later', () => {
    expect(nextPingTime(match, at('2026-01-01T10:02:10.000Z'))).toBe(
      at('2026-01-01T10:05:00.000Z'),
    );
  });

  it('mid-hunt, returns the next ping after now', () => {
    expect(nextPingTime(match, at('2026-01-01T10:06:00.000Z'))).toBe(
      at('2026-01-01T10:08:00.000Z'),
    );
  });

  it('is null when no ping is left or the match is not in the hunt', () => {
    expect(nextPingTime(match, at('2026-01-01T10:11:30.000Z'))).toBeNull();
    expect(
      nextPingTime(
        { ...match, status: 'HIDING' },
        at('2026-01-01T10:01:00.000Z'),
      ),
    ).toBeNull();
  });
});

describe('time', () => {
  const now = Date.parse('2026-01-01T10:00:00.000Z');

  it('msUntil', () => {
    expect(msUntil('2026-01-01T10:01:00.000Z', now)).toBe(60_000);
    expect(msUntil('2026-01-01T09:59:00.000Z', now)).toBe(0);
    expect(msUntil(null, now)).toBeNull();
  });

  it.each([
    [0, '00:00'],
    [400, '00:01'],
    [75_000, '01:15'],
    [3_725_000, '1:02:05'],
  ])('formatCountdown(%i) = %s', (ms, expected) => {
    expect(formatCountdown(ms)).toBe(expected);
  });

  it('clockOffsetMs: positivo si el servidor va por delante', () => {
    expect(clockOffsetMs('2026-01-01T10:00:02.000Z', now)).toBe(2000);
  });
});
