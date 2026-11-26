import { Pressable, StyleSheet } from 'react-native';
import { Icon, type IconName } from './icon';
import { radius, type ThemeColors } from './theme';
import { useThemeColors } from './use-theme';

export interface IconButtonProps {
  icon: IconName;
  /** Read by screen readers, since there's no visible text. */
  label: string;
  onPress: () => void;
  color?: keyof ThemeColors;
  size?: number;
  disabled?: boolean;
}

/** A round button with only an icon, for secondary actions in lists. */
export function IconButton({
  icon,
  label,
  onPress,
  color = 'textMuted',
  size = 36,
  disabled = false,
}: IconButtonProps) {
  const c = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          width: size,
          height: size,
          backgroundColor: c.surfaceAlt,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Icon name={icon} color={color} size={Math.round(size * 0.5)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
