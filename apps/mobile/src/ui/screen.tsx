import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { spacing } from './theme';
import { useThemeColors } from './use-theme';

export interface ScreenProps {
  children: ReactNode;
  /** Envuelve el contenido en un ScrollView (formularios, listas cortas). */
  scroll?: boolean;
  /** Sin padding: para pantallas a sangre como el mapa. */
  bleed?: boolean;
  /** Bordes con safe area (por defecto abajo: el header ya cubre arriba). */
  edges?: Edge[];
  /** Pie fijo (botones de acción). */
  footer?: ReactNode;
}

export function Screen({
  children,
  scroll,
  bleed,
  edges = ['bottom'],
  footer,
}: ScreenProps) {
  const c = useThemeColors();
  const padding = bleed ? undefined : styles.padded;

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, padding]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, styles.content, padding]}>{children}</View>
  );

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.fill, { backgroundColor: c.background }]}
    >
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {body}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { gap: spacing.lg },
  padded: { padding: spacing.lg },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
});
