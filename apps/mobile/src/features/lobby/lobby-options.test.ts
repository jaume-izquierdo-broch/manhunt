import { MATCH_LIMITS } from '@manhunt/types';
import {
  DURATION_OPTIONS,
  HIDING_OPTIONS,
  PING_OPTIONS,
  RADIUS_OPTIONS,
} from './lobby-options';

describe('match options', () => {
  it('stay within the server limits', () => {
    const within = (
      values: readonly { value: number }[],
      limits: { min: number; max: number },
    ) => values.every((o) => o.value >= limits.min && o.value <= limits.max);

    expect(within(RADIUS_OPTIONS, MATCH_LIMITS.radiusMeters)).toBe(true);
    expect(within(HIDING_OPTIONS, MATCH_LIMITS.hidingSeconds)).toBe(true);
    expect(within(DURATION_OPTIONS, MATCH_LIMITS.durationSeconds)).toBe(true);
    expect(within(PING_OPTIONS, MATCH_LIMITS.pingIntervalSeconds)).toBe(true);
  });

  it('include the defaults, so a new lobby always has one selected', () => {
    const has = (values: readonly { value: number }[], value: number) =>
      values.some((o) => o.value === value);

    expect(has(RADIUS_OPTIONS, MATCH_LIMITS.radiusMeters.default)).toBe(true);
    expect(has(HIDING_OPTIONS, MATCH_LIMITS.hidingSeconds.default)).toBe(true);
    expect(has(DURATION_OPTIONS, MATCH_LIMITS.durationSeconds.default)).toBe(
      true,
    );
    expect(has(PING_OPTIONS, MATCH_LIMITS.pingIntervalSeconds.default)).toBe(
      true,
    );
  });
});
