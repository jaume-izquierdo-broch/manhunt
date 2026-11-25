import { colors, type ThemeColors } from './theme';

/**
 * The theme colors. The app has a single dark theme; components still read
 * colors through this hook so a theme switch could be added in one place.
 */
export function useThemeColors(): ThemeColors {
  return colors;
}
