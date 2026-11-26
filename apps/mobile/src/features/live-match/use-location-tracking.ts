import { PlayerStatus } from '@manhunt/types';
import { useEffect, useRef } from 'react';
import {
  canLocate,
  useLocationAccess,
  useLocationAccessStore,
} from '@/features/location/location-access.store';
import { useRealtime } from '@/features/realtime/realtime.store';
import { emitWithAck } from '@/features/realtime/socket';
import { watchPosition } from '@/lib/location/device-location';
import { useLiveMatch } from './live-match.store';
import { isLive } from './rules/players';
import {
  type ReportedPosition,
  shouldReport,
} from './rules/location-reporting';

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
  const access = useLocationAccess();
  const located = canLocate(access);
  const connected = useRealtime((s) => s.status === 'connected');

  // When the match starts without permission, show the system dialog once.
  // If it's refused, the play screen shows how to allow it.
  const asked = useRef(false);
  useEffect(() => {
    if (!tracking || access !== 'askable' || asked.current) return;
    asked.current = true;
    void useLocationAccessStore.getState().fix();
  }, [tracking, access]);

  // 1. Watch the GPS.
  useEffect(() => {
    if (!tracking || !located) return;
    const { setMyPosition } = useLiveMatch.getState();
    let stop: (() => void) | null = null;
    let cancelled = false;
    watchPosition(setMyPosition)
      .then((unsubscribe) => (cancelled ? unsubscribe() : (stop = unsubscribe)))
      .catch(() => undefined);
    return () => {
      cancelled = true;
      stop?.();
      setMyPosition(null); // don't keep reporting a position that's no longer watched
    };
  }, [tracking, located]);

  // 2. Report the position to the server.
  useEffect(() => {
    if (!tracking || !connected) return;
    let lastReported: ReportedPosition | null = null;

    const tick = () => {
      const position = useLiveMatch.getState().myPosition;
      const { socket } = useRealtime.getState();
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
