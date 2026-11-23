import { useColorScheme } from 'react-native';
import { colors, type ColorScheme, type ThemeColors } from './theme';

export function useColorSchemeName(): ColorScheme {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

/** Colores del tema actual (claro u oscuro según el sistema). */
export function useThemeColors(): ThemeColors {
  return colors[useColorSchemeName()];
}
