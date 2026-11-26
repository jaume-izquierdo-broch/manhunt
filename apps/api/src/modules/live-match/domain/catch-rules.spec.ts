import type { PositionDto } from '@manhunt/types';
import { checkCatch } from './catch-rules.js';

const now = new Date('2026-01-01T10:00:00.000Z');
const rules = { radiusMeters: 25, maxPositionAgeMs: 30_000 };

const position = (lat: number, secondsAgo = 0): PositionDto => ({
  userId: 'u',
  lat,
  lng: 2.17,
  accuracy: 5,
  at: new Date(now.getTime() - secondsAgo * 1000).toISOString(),
});

describe('checkCatch', () => {
  it('accepts close players with recent positions', () => {
    const result = checkCatch(position(41.387), position(41.38705), now, rules);
    expect(result.ok).toBe(true);
  });

  it('rejects players that are too far apart', () => {
    const result = checkCatch(position(41.387), position(41.389), now, rules);
    expect(result).toMatchObject({ ok: false, reason: 'TOO_FAR' });
  });

  it('rejects when a position is missing', () => {
    expect(checkCatch(position(41.387), null, now, rules)).toEqual({
      ok: false,
      reason: 'POSITION_UNKNOWN',
    });
  });

  it('rejects stale positions', () => {
    const result = checkCatch(
      position(41.387),
      position(41.387, 31),
      now,
      rules,
    );
    expect(result).toEqual({ ok: false, reason: 'POSITION_UNKNOWN' });
  });
});
