import type { PositionDto } from '@manhunt/types';
import { distanceMeters } from './geo.js';

export interface CatchRules {
  /** Distancia máxima entre cazador y escapador. */
  radiusMeters: number;
  /** Antigüedad máxima de una posición para fiarse de ella. */
  maxPositionAgeMs: number;
}

export type CatchCheck =
  | { ok: true; distanceMeters: number }
  | { ok: false; reason: 'POSITION_UNKNOWN' }
  | { ok: false; reason: 'TOO_FAR'; distanceMeters: number };

/**
 * ¿Vale la captura? Ambos necesitan una posición reciente y estar dentro del radio.
 * (El GPS de un móvil falla 5-20 m: el radio por defecto es generoso.)
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
