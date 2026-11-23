import { StyleSheet } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { useThemeColors } from '@/ui';
import { regionForArea } from '../domain/geo';
import type { GameMapProps } from './game-map.types';

/** Mapa de la partida: zona de juego, compañeros y (para cazadores) el último ping. */
export function GameMap({ area, markers, accentColor }: GameMapProps) {
  const c = useThemeColors();
  return (
    <MapView
      style={StyleSheet.absoluteFill}
      initialRegion={regionForArea(area)}
      showsUserLocation
      showsMyLocationButton
      showsCompass={false}
      toolbarEnabled={false}
      accessibilityLabel="Mapa de la partida"
    >
      <Circle
        center={{ latitude: area.lat, longitude: area.lng }}
        radius={area.radiusMeters}
        strokeColor={accentColor}
        strokeWidth={3}
        fillColor={`${accentColor}1A`}
      />
      {markers.map((m) => (
        <Marker
          key={`${m.kind}-${m.id}`}
          coordinate={{ latitude: m.lat, longitude: m.lng }}
          title={m.title}
          description={m.description}
          pinColor={m.kind === 'ping' ? c.hunter : c.primary}
        />
      ))}
    </MapView>
  );
}
