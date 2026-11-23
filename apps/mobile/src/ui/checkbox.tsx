import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './app-text';
import { radius, spacing } from './theme';
import { useThemeColors } from './use-theme';

export interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}

export function Checkbox({ label, checked, onChange, error }: CheckboxProps) {
  const c = useThemeColors();
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        onPress={() => onChange(!checked)}
        hitSlop={8}
        style={styles.row}
      >
        <View
          style={[
            styles.box,
            {
              borderColor: error ? c.danger : checked ? c.primary : c.border,
              backgroundColor: checked ? c.primary : c.surface,
            },
          ]}
        >
          {checked ? (
            <AppText variant="label" tone="onPrimary" style={styles.tick}>
              ✓
            </AppText>
          ) : null}
        </View>
        <AppText style={styles.label}>{label}</AppText>
      </Pressable>
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  box: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: radius.sm / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: { lineHeight: 18 },
  label: { flex: 1 },
});
