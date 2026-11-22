import { distanceMeters } from './geo.js';

describe('distanceMeters', () => {
  it('es 0 para el mismo punto', () => {
    expect(
      distanceMeters({ lat: 41.39, lng: 2.17 }, { lat: 41.39, lng: 2.17 }),
    ).toBe(0);
  });

  it('calcula ~111 km por grado de latitud', () => {
    const d = distanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_400);
  });

  it('calcula distancias cortas con precisión de metros', () => {
    // 0.0001º de latitud ≈ 11,1 m
    const d = distanceMeters(
      { lat: 41.3874, lng: 2.1686 },
      { lat: 41.3875, lng: 2.1686 },
    );
    expect(d).toBeCloseTo(11.1, 0);
  });
});
