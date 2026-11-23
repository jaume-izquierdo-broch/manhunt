import type { PlayArea } from '@manhunt/types';

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_METERS = 6_371_000;
const METERS_PER_DEGREE_LAT = 111_320;

/** Distance in meters (haversine). The server validates catches with the same formula. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/** The map region that shows the whole play area with a small margin. */
export function regionForArea(area: PlayArea, margin = 1.25): MapRegion {
  const spanMeters = area.radiusMeters * 2 * margin;
  const latitudeDelta = spanMeters / METERS_PER_DEGREE_LAT;
  const longitudeDelta =
    latitudeDelta / Math.max(Math.cos((area.lat * Math.PI) / 180), 0.01);
  return {
    latitude: area.lat,
    longitude: area.lng,
    latitudeDelta,
    longitudeDelta,
  };
}

export function isInsideArea(point: LatLng, area: PlayArea): boolean {
  return distanceMeters(point, area) <= area.radiusMeters;
}
