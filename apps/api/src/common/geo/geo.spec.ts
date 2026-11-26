import { distanceMeters } from './geo.js';

describe('distanceMeters', () => {
  it('is 0 for the same point', () => {
    expect(
      distanceMeters({ lat: 41.39, lng: 2.17 }, { lat: 41.39, lng: 2.17 }),
    ).toBe(0);
  });

  it('is ~111 km per degree of latitude', () => {
    const d = distanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_400);
  });

  it('is accurate to the meter over short distances', () => {
    // 0.0001° of latitude ≈ 11.1 m
    const d = distanceMeters(
      { lat: 41.3874, lng: 2.1686 },
      { lat: 41.3875, lng: 2.1686 },
    );
    expect(d).toBeCloseTo(11.1, 0);
  });
});
