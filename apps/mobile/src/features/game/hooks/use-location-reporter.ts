import { useEffect, useEffectEvent, useRef } from 'react';
import type { DevicePosition } from '@/lib/location/device-location';
import {
  type ReportedPosition,
  shouldReport,
} from '../domain/location-reporting';

const CHECK_EVERY_MS = 1_000;

/**
 * Envía la posición al servidor según `shouldReport`: al moverse (con un mínimo
 * entre envíos) y, aunque estés quieto, cada pocos segundos (heartbeat).
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

  // Lee siempre la posición y el `report` más recientes sin reiniciar el intervalo.
  const tick = useEffectEvent(() => {
    const now = Date.now();
    if (!position || !shouldReport(now, position, lastReported.current)) return;
    lastReported.current = { lat: position.lat, lng: position.lng, at: now };
    report(position).catch(() => {
      // Si falla, se reintenta en el siguiente tick.
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
