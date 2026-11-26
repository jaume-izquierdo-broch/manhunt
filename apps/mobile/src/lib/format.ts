/** 90 -> "1 min 30 s", 1800 -> "30 min", 3600 -> "1 h". */
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return (
    [h && `${h} h`, m && `${m} min`, s && `${s} s`].filter(Boolean).join(' ') ||
    '0 s'
  );
}

/** 12.4 -> "12 m", 1000 -> "1 km", 1500 -> "1.5 km". */
export function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${Number((meters / 1000).toFixed(1))} km`
    : `${Math.round(meters)} m`;
}

/** 1 -> "1 player", 3 -> "3 players". */
export function countOf(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
