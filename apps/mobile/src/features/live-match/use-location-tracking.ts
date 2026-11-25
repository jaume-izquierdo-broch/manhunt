import { PlayerStatus } from '@manhunt/types';
import { useEffect } from 'react';
import {
  getLocationPermission,
  watchPosition,
} from '@/lib/location/device-location';
import { useLiveMatch } from './live-match.store';
import { isLive } from './rules/players';
import {
  type ReportedPosition,
  shouldReport,
} from './rules/location-reporting';
import { emitWithAck } from './socket';

const CHECK_EVERY_MS = 1_000;

/**
 * The phone's GPS during a match. Only runs while the match is live and I'm
 * still free, to save battery:
 *
 * 1. Watches the position and keeps it in the store (`myPosition`).
 * 2. Sends it to the server when `shouldReport` says so: when I move, and every
 *    few seconds even if I stand still, so catches can be validated.
 */
export function useLocationTracking() {
  const tracking = useLiveMatch(
    (s) => isLive(s.match?.status) && s.me?.status === PlayerStatus.ALIVE,
  );
  const granted = useLiveMatch((s) => s.locationPermission === 'granted');
  const connected = useLiveMatch((s) => s.connection === 'connected');

  // Know the permission from the start: the lobby offers to grant it in advance.
  useEffect(() => {
    getLocationPermission()
      .then(useLiveMatch.getState().setLocationPermission)
      .catch(() => undefined);
  }, []);

  // 1. Watch the GPS (asking for permission first if needed).
  useEffect(() => {
    if (!tracking) return;
    const { setMyPosition, requestLocationPermission } =
      useLiveMatch.getState();
    if (!granted) {
      void requestLocationPermission();
      return;
    }

    let stop: (() => void) | null = null;
    let cancelled = false;
    watchPosition(setMyPosition)
      .then((unsubscribe) => (cancelled ? unsubscribe() : (stop = unsubscribe)))
      .catch(() => undefined);
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [tracking, granted]);

  // 2. Report the position to the server.
  useEffect(() => {
    if (!tracking || !connected) return;
    let lastReported: ReportedPosition | null = null;

    const tick = () => {
      const { myPosition: position, socket } = useLiveMatch.getState();
      const now = Date.now();
      if (!position || !socket || !shouldReport(now, position, lastReported)) {
        return;
      }
      lastReported = { lat: position.lat, lng: position.lng, at: now };
      emitWithAck(socket, 'location:update', {
        lat: position.lat,
        lng: position.lng,
        ...(position.accuracy !== null && { accuracy: position.accuracy }),
      }).catch(() => {
        lastReported = null; // retry on the next tick
      });
    };

    tick();
    const id = setInterval(tick, CHECK_EVERY_MS);
    return () => clearInterval(id);
  }, [tracking, connected]);
}
