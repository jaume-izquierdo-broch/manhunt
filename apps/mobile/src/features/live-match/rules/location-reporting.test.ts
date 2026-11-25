import { shouldReport } from './location-reporting';

const here = { lat: 41.387, lng: 2.17 };
const tenMetersNorth = { lat: here.lat + 10 / 111_000, lng: here.lng };
const policy = { minIntervalMs: 3000, heartbeatMs: 10_000, minMoveMeters: 3 };

describe('shouldReport', () => {
  it('always reports the first position', () => {
    expect(shouldReport(0, here, null, policy)).toBe(true);
  });

  it('never reports twice within the minimum interval, even when moving', () => {
    expect(shouldReport(1000, tenMetersNorth, { ...here, at: 0 }, policy)).toBe(
      false,
    );
  });

  it('reports after moving once the minimum interval has passed', () => {
    expect(shouldReport(4000, tenMetersNorth, { ...here, at: 0 }, policy)).toBe(
      true,
    );
  });

  it('when standing still, waits for the heartbeat', () => {
    expect(shouldReport(5000, here, { ...here, at: 0 }, policy)).toBe(false);
    expect(shouldReport(10_000, here, { ...here, at: 0 }, policy)).toBe(true);
  });
});
