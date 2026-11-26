import { MATCH_LIMITS } from '@manhunt/types';
import {
  DURATION_OPTIONS,
  HIDING_OPTIONS,
  PING_OPTIONS,
  RADIUS_OPTIONS,
} from './match-options';

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
});
