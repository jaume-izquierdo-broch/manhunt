import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './app-text';
import { radius, spacing } from './theme';
import { useThemeColors } from './use-theme';

export interface Option<T> {
  value: T;
  label: string;
}

export interface OptionPickerProps<T> {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Pick one of a few options, shown as chips. Replaces sliders and native pickers. */
export function OptionPicker<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: OptionPickerProps<T>) {
  const c = useThemeColors();
  return (
    <View
      style={styles.container}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
    >
      <AppText variant="label">{label}</AppText>
      <View style={styles.row}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${label}: ${option.label}`}
              onPress={() => onChange(option.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? c.primary : c.surface,
                  borderColor: selected ? c.primary : c.border,
                },
              ]}
            >
              <AppText
                variant="label"
                tone={selected ? 'onPrimary' : 'default'}
              >
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
