import { Text, type TextProps } from 'react-native';
import { typography } from './theme';
import { useThemeColors } from './use-theme';

export type TextVariant = keyof typeof typography;
export type TextTone =
  | 'default'
  | 'muted'
  | 'danger'
  | 'hunter'
  | 'runner'
  | 'primary'
  | 'onPrimary';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  center?: boolean;
}

export function AppText({
  variant = 'body',
  tone = 'default',
  center,
  style,
  ...props
}: AppTextProps) {
  const c = useThemeColors();
  const color = {
    default: c.text,
    muted: c.textMuted,
    danger: c.danger,
    hunter: c.hunter,
    runner: c.runner,
    primary: c.primary,
    onPrimary: c.onPrimary,
  }[tone];

  return (
    <Text
      style={[
        typography[variant],
        { color },
        center && { textAlign: 'center' },
        style,
      ]}
      {...props}
    />
  );
}
