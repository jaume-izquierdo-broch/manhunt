import { shouldReport } from './location-reporting';

const here = { lat: 41.387, lng: 2.17 };
const tenMetersNorth = { lat: here.lat + 10 / 111_000, lng: here.lng };
const policy = { minIntervalMs: 3000, heartbeatMs: 10_000, minMoveMeters: 3 };

describe('shouldReport', () => {
  it('la primera posición siempre se envía', () => {
    expect(shouldReport(0, here, null, policy)).toBe(true);
  });

  it('no envía dos veces en menos del intervalo mínimo aunque te muevas', () => {
    expect(shouldReport(1000, tenMetersNorth, { ...here, at: 0 }, policy)).toBe(
      false,
    );
  });

  it('envía si te has movido y ha pasado el intervalo mínimo', () => {
    expect(shouldReport(4000, tenMetersNorth, { ...here, at: 0 }, policy)).toBe(
      true,
    );
  });

  it('quieto no envía hasta el heartbeat', () => {
    expect(shouldReport(5000, here, { ...here, at: 0 }, policy)).toBe(false);
    expect(shouldReport(10_000, here, { ...here, at: 0 }, policy)).toBe(true);
  });
});
