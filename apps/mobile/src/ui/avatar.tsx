import { StyleSheet, View } from 'react-native';
import { AppText } from './app-text';
import { radius, type ThemeColors } from './theme';
import { useThemeColors } from './use-theme';

/** A round avatar with the first letter of the name. */
export function Avatar({
  name,
  size = 40,
  color = 'primary',
}: {
  name: string;
  size?: number;
  color?: keyof ThemeColors;
}) {
  const c = useThemeColors();
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, backgroundColor: c[color] },
      ]}
    >
      <AppText
        tone="onPrimary"
        style={{
          fontSize: size * 0.42,
          lineHeight: size * 0.52,
          fontWeight: '700',
        }}
      >
        {name.charAt(0).toUpperCase()}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
