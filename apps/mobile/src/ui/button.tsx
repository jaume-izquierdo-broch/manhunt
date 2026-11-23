import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { AppText } from './app-text';
import { radius, spacing } from './theme';
import { useThemeColors } from './use-theme';

export type ButtonVariant =
  'primary' | 'secondary' | 'danger' | 'ghost' | 'hunter' | 'runner';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  compact = false,
  style,
  accessibilityHint,
}: ButtonProps) {
  const c = useThemeColors();
  const inactive = disabled || loading;

  const background = {
    primary: c.primary,
    secondary: c.surfaceAlt,
    danger: c.danger,
    ghost: 'transparent',
    hunter: c.hunter,
    runner: c.runner,
  }[variant];
  const filled = variant !== 'secondary' && variant !== 'ghost';
  const tone = filled
    ? 'onPrimary'
    : variant === 'ghost'
      ? 'primary'
      : 'default';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        {
          backgroundColor: background,
          opacity: inactive ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={filled ? c.onPrimary : c.text} />
      ) : (
        <AppText variant="label" tone={tone}>
          {title}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
});
