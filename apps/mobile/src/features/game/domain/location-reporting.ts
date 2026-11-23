import { distanceMeters, type LatLng } from './geo';

export interface ReportPolicy {
  /** Nunca más de un envío cada X ms (ahorra batería y datos). */
  minIntervalMs: number;
  /** Aunque no te muevas, se reenvía cada X ms: el servidor solo acepta
   *  capturas con posiciones de menos de 30 s. */
  heartbeatMs: number;
  /** Movimiento mínimo para enviar antes del heartbeat. */
  minMoveMeters: number;
}

export const DEFAULT_REPORT_POLICY: ReportPolicy = {
  minIntervalMs: 3_000,
  heartbeatMs: 10_000,
  minMoveMeters: 3,
};

export interface ReportedPosition extends LatLng {
  at: number;
}

/** ¿Toca enviar la posición actual al servidor? */
export function shouldReport(
  nowMs: number,
  current: LatLng,
  lastReported: ReportedPosition | null,
  policy: ReportPolicy = DEFAULT_REPORT_POLICY,
): boolean {
  if (!lastReported) return true;
  const elapsed = nowMs - lastReported.at;
  if (elapsed < policy.minIntervalMs) return false;
  if (elapsed >= policy.heartbeatMs) return true;
  return distanceMeters(current, lastReported) >= policy.minMoveMeters;
}
