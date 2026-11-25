import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './app-text';
import { radius, spacing } from './theme';
import { useThemeColors } from './use-theme';

/**
 * The label is usually plain text. It may also contain inline links (a nested
 * `<AppText variant="caption" onPress>`), and then screen readers need
 * `accessibilityLabel`.
 */
type LabelProps =
  | { label: string; accessibilityLabel?: string }
  | { label: ReactNode; accessibilityLabel: string };

export type CheckboxProps = LabelProps & {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
};

export function Checkbox({
  label,
  accessibilityLabel,
  checked,
  onChange,
  error,
}: CheckboxProps) {
  const c = useThemeColors();
  const toggle = () => onChange(!checked);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          accessibilityLabel={
            accessibilityLabel ??
            (typeof label === 'string' ? label : undefined)
          }
          onPress={toggle}
          hitSlop={8}
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
        </Pressable>
        {/* Tapping the text toggles too; a link nested inside handles its own tap.
            Caption size: these labels are usually consent sentences. */}
        <AppText variant="caption" style={styles.label} onPress={toggle}>
          {label}
        </AppText>
      </View>
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
