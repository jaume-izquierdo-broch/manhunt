import { StyleSheet, View } from 'react-native';
import { AppText, Card, spacing, useThemeColors } from '@/ui';
import type { GameMapProps } from './game-map.types';

/** react-native-maps no funciona en web: lista de posiciones para poder probar en el navegador. */
export function GameMap({ area, markers }: GameMapProps) {
  const c = useThemeColors();
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        { backgroundColor: c.surfaceAlt },
      ]}
    >
      <Card>
        <AppText variant="label">Mapa no disponible en web</AppText>
        <AppText variant="caption" tone="muted">
          Zona: {area.lat.toFixed(5)}, {area.lng.toFixed(5)} · radio{' '}
          {area.radiusMeters} m
        </AppText>
        {markers.map((m) => (
          <AppText key={`${m.kind}-${m.id}`} variant="caption">
            {m.kind === 'ping' ? '📡' : '👤'} {m.title}: {m.lat.toFixed(5)},{' '}
            {m.lng.toFixed(5)}
          </AppText>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', padding: spacing.lg },
});
