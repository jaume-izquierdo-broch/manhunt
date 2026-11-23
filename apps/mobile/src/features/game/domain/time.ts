/** Milisegundos que faltan hasta `iso` (nunca negativo), o null si no hay fecha. */
export function msUntil(
  iso: string | null | undefined,
  nowMs: number,
): number | null {
  if (!iso) return null;
  return Math.max(0, Date.parse(iso) - nowMs);
}

/** 75_000 -> "01:15", 3_725_000 -> "1:02:05". Redondea hacia arriba (no enseña 00:00 antes de tiempo). */
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
 * Próximo ping (ms epoch) o null. Mismo cálculo que el servidor:
 * ping n = fin del escondite + n × intervalo, siempre antes del final.
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
 * Diferencia entre el reloj del servidor y el del móvil. Los relojes de los
 * móviles se desvían; las cuentas atrás usan `Date.now() + offset`.
 */
export function clockOffsetMs(
  serverTimeIso: string,
  receivedAtMs: number,
): number {
  return Date.parse(serverTimeIso) - receivedAtMs;
}
