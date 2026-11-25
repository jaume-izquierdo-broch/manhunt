import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from './icon';
import { radius, type ThemeColors } from './theme';
import { useThemeColors } from './use-theme';

/** An icon on a tinted rounded square, for list rows and cards. */
export function IconBadge({
  name,
  color = 'primary',
  size = 40,
}: {
  name: IconName;
  color?: keyof ThemeColors;
  size?: number;
}) {
  const c = useThemeColors();
  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          // The same color at 15% opacity (8-digit hex: "26" = 0.15).
          backgroundColor: `${c[color]}26`,
        },
      ]}
    >
      <Icon name={name} color={color} size={Math.round(size * 0.55)} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
