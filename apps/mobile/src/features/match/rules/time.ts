/** Milliseconds left until `iso` (never negative), or null without a date. */
export function msUntil(
  iso: string | null | undefined,
  nowMs: number,
): number | null {
  if (!iso) return null;
  return Math.max(0, Date.parse(iso) - nowMs);
}

/** 75_000 -> "01:15", 3_725_000 -> "1:02:05". Rounds up, so it never shows 00:00 too early. */
export function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mmss = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

export interface PingSchedule {
  status: string;
  hidingEndsAt: string | null;
  endsAt: string | null;
  pingIntervalSeconds: number;
}

/**
 * The next ping (epoch ms), or null. Same schedule as the server:
 * ping n = end of hiding + n × interval, as long as it's before the end.
 */
export function nextPingTime(
  match: PingSchedule,
  nowMs: number,
): number | null {
  if (match.status !== 'ACTIVE' || !match.hidingEndsAt || !match.endsAt)
    return null;
  const start = Date.parse(match.hidingEndsAt);
  const interval = match.pingIntervalSeconds * 1000;
  const seq = Math.max(1, Math.floor((nowMs - start) / interval) + 1);
  const at = start + seq * interval;
  return at < Date.parse(match.endsAt) ? at : null;
}

/**
 * Server clock minus phone clock. Phone clocks drift, so countdowns use
 * `Date.now() + offset`.
 */
export function clockOffsetMs(
  serverTimeIso: string,
  receivedAtMs: number,
): number {
  return Date.parse(serverTimeIso) - receivedAtMs;
}
