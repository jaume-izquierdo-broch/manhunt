import type { PositionDto } from '@manhunt/types';
import { checkCatch } from './catch-rules.js';

const now = new Date('2026-01-01T10:00:00.000Z');
const rules = { radiusMeters: 25, maxPositionAgeMs: 30_000 };

const position = (lat: number, secondsAgo = 0, userId = 'u'): PositionDto => ({
  userId,
  lat,
  lng: 2.17,
  accuracy: 5,
  at: new Date(now.getTime() - secondsAgo * 1000).toISOString(),
});

describe('checkCatch', () => {
  it('acepta si están cerca y las posiciones son recientes', () => {
    const result = checkCatch(position(41.387), position(41.38705), now, rules);
    expect(result.ok).toBe(true);
  });

  it('rechaza si están demasiado lejos', () => {
    const result = checkCatch(position(41.387), position(41.389), now, rules);
    expect(result).toMatchObject({ ok: false, reason: 'TOO_FAR' });
  });

  it('rechaza si falta una posición', () => {
    expect(checkCatch(position(41.387), null, now, rules)).toEqual({
      ok: false,
      reason: 'POSITION_UNKNOWN',
    });
  });

  it('rechaza posiciones antiguas', () => {
    const result = checkCatch(
      position(41.387),
      position(41.387, 31),
      now,
      rules,
    );
    expect(result).toEqual({ ok: false, reason: 'POSITION_UNKNOWN' });
  });
});
