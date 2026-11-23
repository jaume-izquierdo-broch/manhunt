import { useColorScheme } from 'react-native';
import { colors, type ColorScheme, type ThemeColors } from './theme';

export function useColorSchemeName(): ColorScheme {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

/** Colors of the current theme (light or dark, following the system setting). */
export function useThemeColors(): ThemeColors {
  return colors[useColorSchemeName()];
}
