// Design tokens. Components in src/ui use them; screens never hard-code colors.
import { Platform } from 'react-native';

/**
 * The app is always dark, like its icon: near-black with a crimson accent.
 *
 * Crimson is the brand color (buttons, links, selection). The teams use their
 * own colors so they never look like a button or an error: hunters orange,
 * runners green.
 */
export const colors = {
  background: '#0B0A0C',
  surface: '#161417',
  surfaceAlt: '#221F23',
  border: '#332F34',
  text: '#EFEBEC',
  textMuted: '#A59FA4',

  primary: '#DC2F45',
  onPrimary: '#FFFFFF',

  hunter: '#F76B15',
  runner: '#30A46C',
  warning: '#FFC53D',
  danger: '#FF6369',

  overlay: 'rgba(0, 0, 0, 0.8)',
} as const;

export type ThemeColors = { [K in keyof typeof colors]: string };

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
    fontSize: 28,
    fontWeight: '800' as const,
    lineHeight: 36,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
};
