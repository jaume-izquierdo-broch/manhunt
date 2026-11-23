import type { PlayArea } from '@manhunt/types';

export type MapMarkerKind = 'teammate' | 'ping';

export interface MapMarkerData {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description?: string;
  kind: MapMarkerKind;
}

export interface GameMapProps {
  area: PlayArea;
  markers: MapMarkerData[];
  /** Color del borde de la zona (el de tu equipo). */
  accentColor: string;
}
