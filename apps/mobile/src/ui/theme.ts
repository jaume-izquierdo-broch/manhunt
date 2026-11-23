// Design tokens. Components in src/ui use them; screens never hard-code colors.
import { Platform } from 'react-native';

const brand = {
  hunter: '#E5484D',
  runner: '#30A46C',
  accent: '#3E63DD',
  warning: '#F5A524',
};

export const colors = {
  light: {
    ...brand,
    background: '#F7F7F8',
    surface: '#FFFFFF',
    surfaceAlt: '#EEEEF0',
    border: '#DCDCE0',
    text: '#111113',
    textMuted: '#62636C',
    primary: brand.accent,
    onPrimary: '#FFFFFF',
    danger: '#CE2C31',
    overlay: 'rgba(17, 17, 19, 0.72)',
  },
  dark: {
    ...brand,
    background: '#0F0F11',
    surface: '#18181B',
    surfaceAlt: '#232326',
    border: '#34343A',
    text: '#EDEDEF',
    textMuted: '#A0A0A8',
    primary: '#5472E4',
    onPrimary: '#FFFFFF',
    danger: '#FF6369',
    overlay: 'rgba(0, 0, 0, 0.78)',
  },
} as const;

export type ColorScheme = keyof typeof colors;
export type ThemeColors = { [K in keyof (typeof colors)['light']]: string };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 28, fontWeight: '800' as const, lineHeight: 34 },
  subtitle: { fontSize: 20, fontWeight: '700' as const, lineHeight: 26 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: '600' as const, lineHeight: 18 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  mono: {
    fontSize: 32,
    fontWeight: '800' as const,
    letterSpacing: 6,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
};
