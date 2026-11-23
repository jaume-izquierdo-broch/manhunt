import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText } from './app-text';
import { spacing } from './theme';
import { useThemeColors } from './use-theme';

export function LoadingView({ message }: { message?: string }) {
  const c = useThemeColors();
  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ActivityIndicator size="large" color={c.primary} />
      {message ? (
        <AppText tone="muted" center>
          {message}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
});
