import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';
import { AppText } from './app-text';
import { radius, spacing, typography } from './theme';
import { useThemeColors } from './use-theme';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
}

export function TextField({ label, error, ...inputProps }: TextFieldProps) {
  const c = useThemeColors();
  return (
    <View style={styles.container}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.textMuted}
        style={[
          styles.input,
          {
            color: c.text,
            backgroundColor: c.surface,
            borderColor: error ? c.danger : c.border,
          },
        ]}
        {...inputProps}
      />
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
  input: {
    ...typography.body,
    minHeight: 50,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
});
