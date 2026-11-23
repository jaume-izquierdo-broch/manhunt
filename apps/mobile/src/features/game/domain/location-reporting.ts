import { distanceMeters, type LatLng } from './geo';

export interface ReportPolicy {
  /** Never report more often than this (saves battery and data). */
  minIntervalMs: number;
  /** Report at least this often, even when standing still: the server only
   *  accepts catches based on positions younger than 30 s. */
  heartbeatMs: number;
  /** Minimum movement that triggers a report before the heartbeat. */
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

/** Should the current position be sent to the server now? */
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
