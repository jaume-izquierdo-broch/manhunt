import { useEffect, useEffectEvent, useRef } from 'react';
import type { DevicePosition } from '@/lib/location/device-location';
import {
  type ReportedPosition,
  shouldReport,
} from '../domain/location-reporting';

const CHECK_EVERY_MS = 1_000;

/**
 * Sends the position to the server following `shouldReport`: when moving (with
 * a minimum gap between reports) and, even when still, every few seconds.
 */
export function useLocationReporter({
  enabled,
  position,
  report,
}: {
  enabled: boolean;
  position: DevicePosition | null;
  report: (position: DevicePosition) => Promise<unknown>;
}) {
  const lastReported = useRef<ReportedPosition | null>(null);

  // Always reads the latest position and `report` without restarting the interval.
  const tick = useEffectEvent(() => {
    const now = Date.now();
    if (!position || !shouldReport(now, position, lastReported.current)) return;
    lastReported.current = { lat: position.lat, lng: position.lng, at: now };
    report(position).catch(() => {
      // On failure, retry on the next tick.
      lastReported.current = null;
    });
  });

  useEffect(() => {
    if (!enabled) {
      lastReported.current = null;
      return;
    }
    tick();
    const id = setInterval(tick, CHECK_EVERY_MS);
    return () => clearInterval(id);
  }, [enabled]);
}
