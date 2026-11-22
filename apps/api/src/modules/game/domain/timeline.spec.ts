import {
  computeTimeline,
  nextPingAfter,
  pingSlot,
  pingTime,
} from './timeline.js';

describe('timeline', () => {
  const now = new Date('2026-01-01T10:00:00.000Z');
  const timeline = computeTimeline(now, 120, 600); // 2 min escondite, 10 min caza

  it('calcula el fin del escondite y de la partida', () => {
    expect(timeline.startedAt).toEqual(now);
    expect(timeline.hidingEndsAt.toISOString()).toBe(
      '2026-01-01T10:02:00.000Z',
    );
    expect(timeline.endsAt.toISOString()).toBe('2026-01-01T10:12:00.000Z');
  });

  it('el primer ping llega un intervalo después de empezar la caza', () => {
    expect(pingTime(timeline.hidingEndsAt, 180, 1).toISOString()).toBe(
      '2026-01-01T10:05:00.000Z',
    );
  });

  it('pingSlot devuelve null si el ping cae después del final', () => {
    expect(pingSlot(timeline, 180, 3)?.at.toISOString()).toBe(
      '2026-01-01T10:11:00.000Z',
    );
    expect(pingSlot(timeline, 180, 4)).toBeNull();
  });

  it('durante el escondite el siguiente ping es el primero', () => {
    expect(nextPingAfter(now, timeline, 180)?.seq).toBe(1);
  });

  it('a mitad de la caza devuelve el siguiente ping posterior a ahora', () => {
    const at = new Date('2026-01-01T10:06:00.000Z');
    expect(nextPingAfter(at, timeline, 180)).toEqual({
      seq: 2,
      at: new Date('2026-01-01T10:08:00.000Z'),
    });
  });

  it('no hay siguiente ping si ya no cabe antes del final', () => {
    const at = new Date('2026-01-01T10:11:30.000Z');
    expect(nextPingAfter(at, timeline, 180)).toBeNull();
  });
});
