import { useEffect, useState } from 'react';

/** "Now" by the server's clock, refreshed every second (for countdowns). */
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
