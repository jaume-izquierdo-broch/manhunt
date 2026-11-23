import { useEffect, useState } from 'react';

/** "Ahora" según el reloj del servidor, refrescado cada segundo (para cuentas atrás). */
export function useServerNow(
  clockOffsetMs: number,
  intervalMs = 1_000,
): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now + clockOffsetMs;
}
