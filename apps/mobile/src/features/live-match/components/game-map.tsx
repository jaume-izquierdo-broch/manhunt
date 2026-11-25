import { StyleSheet } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { useThemeColors } from '@/ui';
import { regionForArea } from '../rules/geo';
import { DARK_MAP_STYLE } from './dark-map-style';
import type { GameMapProps } from './game-map.types';

/** The match map: play area, teammates and, for hunters, the latest ping. */
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
      // Dark map: iOS has a built-in one; Android (Google Maps) needs a style.
      userInterfaceStyle="dark"
      customMapStyle={DARK_MAP_STYLE}
      accessibilityLabel="Match map"
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
          // Pinged players are runners; teammates share my team's color.
          pinColor={m.kind === 'ping' ? c.runner : accentColor}
        />
      ))}
    </MapView>
  );
}
