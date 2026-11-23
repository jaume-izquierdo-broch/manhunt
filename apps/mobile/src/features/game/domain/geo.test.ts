import { distanceMeters, isInsideArea, regionForArea } from './geo';

const plaza = { lat: 41.387, lng: 2.17 };

describe('geo', () => {
  it('distanceMeters: ~11 m por cada 0,0001º de latitud', () => {
    expect(
      distanceMeters(plaza, { lat: plaza.lat + 0.0001, lng: plaza.lng }),
    ).toBeCloseTo(11.1, 0);
    expect(distanceMeters(plaza, plaza)).toBe(0);
  });

  it('regionForArea abarca el diámetro de la zona con margen', () => {
    const region = regionForArea({ ...plaza, radiusMeters: 500 });
    expect(region.latitude).toBe(plaza.lat);
    expect(region.latitudeDelta * 111_320).toBeCloseTo(1250, 0);
    // A esta latitud un grado de longitud mide menos: el delta es mayor.
    expect(region.longitudeDelta).toBeGreaterThan(region.latitudeDelta);
  });

  it('isInsideArea', () => {
    const area = { ...plaza, radiusMeters: 100 };
    expect(
      isInsideArea({ lat: plaza.lat + 0.0005, lng: plaza.lng }, area),
    ).toBe(true);
    expect(isInsideArea({ lat: plaza.lat + 0.002, lng: plaza.lng }, area)).toBe(
      false,
    );
  });
});
