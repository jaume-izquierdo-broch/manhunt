// Match timing. Everything is an absolute date; clients compute their own countdowns.
//
//   startedAt ── HIDING ── hidingEndsAt ── ACTIVE (a ping every N s) ── endsAt
//                               ping 1 = hidingEndsAt + N
//                               ping 2 = hidingEndsAt + 2N ...

export interface Timeline {
  startedAt: Date;
  hidingEndsAt: Date;
  endsAt: Date;
}

/** The part of the timeline the ping schedule depends on. */
export type HuntWindow = Pick<Timeline, 'hidingEndsAt' | 'endsAt'>;

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

/** The hunt window of a stored match, or `null` if it hasn't started yet. */
export function huntWindowOf(match: {
  hidingEndsAt: Date | null;
  endsAt: Date | null;
}): HuntWindow | null {
  return match.hidingEndsAt && match.endsAt
    ? { hidingEndsAt: match.hidingEndsAt, endsAt: match.endsAt }
    : null;
}

/** When ping number `seq` (1, 2, 3...) fires. */
export function pingTime(
  hidingEndsAt: Date,
  pingIntervalSeconds: number,
  seq: number,
): Date {
  return new Date(hidingEndsAt.getTime() + seq * pingIntervalSeconds * 1000);
}

/** Ping number `seq`, or `null` if it would fire after the match ends. */
export function pingSlot(
  window: HuntWindow,
  pingIntervalSeconds: number,
  seq: number,
): PingSlot | null {
  const at = pingTime(window.hidingEndsAt, pingIntervalSeconds, seq);
  return at < window.endsAt ? { seq, at } : null;
}

/** The first ping strictly after `now`, or `null` if none is left. */
export function nextPingAfter(
  now: Date,
  window: HuntWindow,
  pingIntervalSeconds: number,
): PingSlot | null {
  const elapsed = now.getTime() - window.hidingEndsAt.getTime();
  const seq = Math.max(
    1,
    Math.floor(elapsed / (pingIntervalSeconds * 1000)) + 1,
  );
  return pingSlot(window, pingIntervalSeconds, seq);
}
