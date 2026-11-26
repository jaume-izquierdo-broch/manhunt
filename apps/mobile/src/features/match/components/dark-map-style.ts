import type { MapStyleElement } from 'react-native-maps';

/** A dark Google Maps style (Android) that matches the app's colors. */
export const DARK_MAP_STYLE: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#1A181B' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8C868B' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0B0A0C' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#332F34' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#1F1C20' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#18221C' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2A262B' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3A3439' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#221F23' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0E1418' }],
  },
];
