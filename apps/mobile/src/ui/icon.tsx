import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { ThemeColors } from './theme';
import { useThemeColors } from './use-theme';

/** Ionicons names, e.g. "settings-outline". Browse them at https://icons.expo.fyi */
export type IconName = ComponentProps<typeof Ionicons>['name'];

export interface IconProps {
  name: IconName;
  size?: number;
  /** A theme color; defaults to the text color. */
  color?: keyof ThemeColors;
}

/**
 * The only place that knows which icon set the app uses.
 * Icons are decorative: the element around them carries the accessible name.
 */
export function Icon({ name, size = 22, color = 'text' }: IconProps) {
  const c = useThemeColors();
  return (
    <Ionicons
      name={name}
      size={size}
      color={c[color]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
