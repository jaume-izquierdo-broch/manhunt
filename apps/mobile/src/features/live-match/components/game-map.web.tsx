import { StyleSheet, View } from 'react-native';
import { AppText, Card, spacing, useThemeColors } from '@/ui';
import type { GameMapProps } from './game-map.types';

/** react-native-maps doesn't support the web: list positions instead, for browser testing. */
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
        <AppText variant="label">Map not available on the web</AppText>
        <AppText variant="caption" tone="muted">
          {`Play area: ${area.lat.toFixed(5)}, ${area.lng.toFixed(5)} · radius ${area.radiusMeters} m`}
        </AppText>
        {markers.map((m) => (
          <AppText key={`${m.kind}-${m.id}`} variant="caption">
            {`${m.kind === 'ping' ? '📡' : '👤'} ${m.title}: ${m.lat.toFixed(5)}, ${m.lng.toFixed(5)}`}
          </AppText>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', padding: spacing.lg },
});
