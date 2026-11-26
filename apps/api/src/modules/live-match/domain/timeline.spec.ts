import {
  computeTimeline,
  huntWindowOf,
  nextPingAfter,
  pingSlot,
  pingTime,
} from './timeline.js';

describe('timeline', () => {
  const now = new Date('2026-01-01T10:00:00.000Z');
  const timeline = computeTimeline(now, 120, 600); // 2 min to hide, 10 min hunt

  it('computes the end of the hiding phase and of the match', () => {
    expect(timeline.startedAt).toEqual(now);
    expect(timeline.hidingEndsAt.toISOString()).toBe(
      '2026-01-01T10:02:00.000Z',
    );
    expect(timeline.endsAt.toISOString()).toBe('2026-01-01T10:12:00.000Z');
  });

  it('fires the first ping one interval after the hunt starts', () => {
    expect(pingTime(timeline.hidingEndsAt, 180, 1).toISOString()).toBe(
      '2026-01-01T10:05:00.000Z',
    );
  });

  it('pingSlot returns null for a ping after the end of the match', () => {
    expect(pingSlot(timeline, 180, 3)?.at.toISOString()).toBe(
      '2026-01-01T10:11:00.000Z',
    );
    expect(pingSlot(timeline, 180, 4)).toBeNull();
  });

  it('during the hiding phase, the next ping is the first one', () => {
    expect(nextPingAfter(now, timeline, 180)?.seq).toBe(1);
  });

  it('mid-hunt, returns the next ping after now', () => {
    const at = new Date('2026-01-01T10:06:00.000Z');
    expect(nextPingAfter(at, timeline, 180)).toEqual({
      seq: 2,
      at: new Date('2026-01-01T10:08:00.000Z'),
    });
  });

  it('returns null when no ping fits before the end', () => {
    const at = new Date('2026-01-01T10:11:30.000Z');
    expect(nextPingAfter(at, timeline, 180)).toBeNull();
  });

  it('huntWindowOf is null until the match starts', () => {
    expect(huntWindowOf({ hidingEndsAt: null, endsAt: null })).toBeNull();
    expect(huntWindowOf(timeline)).toEqual({
      hidingEndsAt: timeline.hidingEndsAt,
      endsAt: timeline.endsAt,
    });
  });
});
