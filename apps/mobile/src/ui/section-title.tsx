import { StyleSheet } from 'react-native';
import { AppText } from './app-text';
import { spacing } from './theme';

/** A small uppercase heading above a group of content. */
export function SectionTitle({ children }: { children: string }) {
  return (
    <AppText
      variant="caption"
      tone="muted"
      accessibilityRole="header"
      style={styles.title}
    >
      {children.toUpperCase()}
    </AppText>
  );
}

const styles = StyleSheet.create({
  title: { marginLeft: spacing.md, letterSpacing: 0.6, fontWeight: '600' },
});
