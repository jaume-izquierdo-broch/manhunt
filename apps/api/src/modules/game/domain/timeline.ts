// Cálculo de horas de una partida. Todo en fechas absolutas (la app hace las cuentas atrás).
//
//   startedAt ──HIDING── hidingEndsAt ──ACTIVE (pings cada N s)── endsAt
//                             │   ping 1 = hidingEndsAt + N
//                             │   ping 2 = hidingEndsAt + 2N ...

export interface Timeline {
  startedAt: Date;
  hidingEndsAt: Date;
  endsAt: Date;
}

export interface PingSlot {
  seq: number;
  at: Date;
}

export function computeTimeline(
  now: Date,
  hidingSeconds: number,
  durationSeconds: number,
): Timeline {
  const hidingEndsAt = new Date(now.getTime() + hidingSeconds * 1000);
  const endsAt = new Date(hidingEndsAt.getTime() + durationSeconds * 1000);
  return { startedAt: now, hidingEndsAt, endsAt };
}

/** Hora del ping número `seq` (1, 2, 3...). */
export function pingTime(
  hidingEndsAt: Date,
  pingIntervalSeconds: number,
  seq: number,
): Date {
  return new Date(hidingEndsAt.getTime() + seq * pingIntervalSeconds * 1000);
}

/** Ping número `seq` si cae antes del final de la partida; si no, `null`. */
export function pingSlot(
  timeline: Pick<Timeline, 'hidingEndsAt' | 'endsAt'>,
  pingIntervalSeconds: number,
  seq: number,
): PingSlot | null {
  const at = pingTime(timeline.hidingEndsAt, pingIntervalSeconds, seq);
  return at < timeline.endsAt ? { seq, at } : null;
}

/** Siguiente ping estrictamente posterior a `now`, o `null` si ya no quedan. */
export function nextPingAfter(
  now: Date,
  timeline: Pick<Timeline, 'hidingEndsAt' | 'endsAt'>,
  pingIntervalSeconds: number,
): PingSlot | null {
  const elapsed = now.getTime() - timeline.hidingEndsAt.getTime();
  const seq = Math.max(
    1,
    Math.floor(elapsed / (pingIntervalSeconds * 1000)) + 1,
  );
  return pingSlot(timeline, pingIntervalSeconds, seq);
}
