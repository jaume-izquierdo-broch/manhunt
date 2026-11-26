import { useRef, useState } from 'react';
import { type GestureResponderEvent, StyleSheet, View } from 'react-native';
import { haptics } from '@/lib/haptics';
import { AppText } from './app-text';
import { IconButton } from './icon-button';
import { radius, spacing } from './theme';
import { useThemeColors } from './use-theme';

export interface StepSliderProps {
  /** The values it can take, in increasing order. */
  steps: readonly number[];
  value: number;
  onChange: (value: number) => void;
  /** Read by screen readers. */
  label: string;
  format: (value: number) => string;
}

const THUMB = 28;
const HEIGHT = 44;
const TRACK = 6;

/** The step closest to `value`, which may not be one of them (older rules). */
function nearestIndex(steps: readonly number[], value: number): number {
  const distances = steps.map((step) => Math.abs(step - value));
  return distances.indexOf(Math.min(...distances));
}

/**
 * Picks a number by dragging along a track, with − and + to move one step.
 * It only stops on `steps`, so every value it gives is a sensible one.
 */
export function StepSlider({
  steps,
  value,
  onChange,
  label,
  format,
}: StepSliderProps) {
  const c = useThemeColors();
  // How far the thumb can travel: the slider's width minus the thumb itself.
  const [travel, setTravel] = useState(0);
  const last = steps.length - 1;
  const offset = last > 0 ? (nearestIndex(steps, value) / last) * travel : 0;
  const lower = steps.filter((step) => step < value).at(-1);
  const higher = steps.find((step) => step > value);

  const set = (next: number | undefined) => {
    if (next === undefined || next === value) return;
    haptics.tick();
    onChange(next);
  };

  // Where the slider starts on screen. Measured when the touch begins, since
  // `locationX` is relative to whatever view the finger is over, and the
  // finger can slide past the ends.
  const left = useRef(0);

  const pickAt = (pageX: number) => {
    if (travel <= 0) return;
    const x = pageX - left.current - THUMB / 2;
    const fraction = Math.min(Math.max(x / travel, 0), 1);
    set(steps[Math.round(fraction * last)]);
  };

  const startTouch = (e: GestureResponderEvent) => {
    left.current = e.nativeEvent.pageX - e.nativeEvent.locationX;
    pickAt(e.nativeEvent.pageX);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <IconButton
          icon="remove"
          label="Less"
          color="text"
          size={HEIGHT}
          disabled={lower === undefined}
          onPress={() => set(lower)}
        />
        <View
          style={styles.slider}
          onLayout={(e) => setTravel(e.nativeEvent.layout.width - THUMB)}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={startTouch}
          onResponderMove={(e) => pickAt(e.nativeEvent.pageX)}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ text: format(value) }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) =>
            set(e.nativeEvent.actionName === 'increment' ? higher : lower)
          }
        >
          <View
            pointerEvents="none"
            style={[styles.track, { backgroundColor: c.surfaceAlt }]}
          >
            <View
              style={[
                styles.fill,
                { width: offset, backgroundColor: c.primary },
              ]}
            />
          </View>
          <View
            pointerEvents="none"
            style={[
              styles.thumb,
              {
                backgroundColor: c.text,
                borderColor: c.primary,
                transform: [{ translateX: offset }],
              },
            ]}
          />
        </View>
        <IconButton
          icon="add"
          label="More"
          color="text"
          size={HEIGHT}
          disabled={higher === undefined}
          onPress={() => set(higher)}
        />
      </View>
      <View style={styles.ends}>
        <AppText variant="caption" tone="muted">
          {format(steps[0] ?? value)}
        </AppText>
        <AppText variant="caption" tone="muted">
          {format(steps[last] ?? value)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  slider: { flex: 1, height: HEIGHT, justifyContent: 'center' },
  track: {
    marginHorizontal: THUMB / 2,
    height: TRACK,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: { height: TRACK },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 4,
  },
  ends: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: HEIGHT + spacing.md,
  },
});
