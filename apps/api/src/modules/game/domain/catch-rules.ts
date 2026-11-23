import type { PositionDto } from '@manhunt/types';
import { distanceMeters } from './geo.js';

export interface CatchRules {
  /** Maximum hunter-runner distance. */
  radiusMeters: number;
  /** Positions older than this are not trusted. */
  maxPositionAgeMs: number;
}

export type CatchCheck =
  | { ok: true; distanceMeters: number }
  | { ok: false; reason: 'POSITION_UNKNOWN' }
  | { ok: false; reason: 'TOO_FAR'; distanceMeters: number };

/**
 * Does the catch count? Both players need a recent position and must be within
 * the radius. Phone GPS is off by 5-20 m, so the default radius is generous.
 */
export function checkCatch(
  hunter: PositionDto | null,
  runner: PositionDto | null,
  now: Date,
  rules: CatchRules,
): CatchCheck {
  const isFresh = (p: PositionDto | null): p is PositionDto =>
    !!p && now.getTime() - Date.parse(p.at) <= rules.maxPositionAgeMs;

  if (!isFresh(hunter) || !isFresh(runner)) {
    return { ok: false, reason: 'POSITION_UNKNOWN' };
  }

  const distance = distanceMeters(hunter, runner);
  return distance <= rules.radiusMeters
    ? { ok: true, distanceMeters: distance }
    : { ok: false, reason: 'TOO_FAR', distanceMeters: distance };
}
