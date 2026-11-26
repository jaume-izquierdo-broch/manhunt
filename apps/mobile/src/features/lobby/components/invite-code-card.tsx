import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { haptics } from '@/lib/haptics';
import {
  AppText,
  Button,
  Card,
  spacing,
  typography,
  useThemeColors,
} from '@/ui';

const COPIED_FOR_MS = 2_000;

export function InviteCodeCard({ code }: { code: string }) {
  const c = useThemeColors();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_FOR_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    await Clipboard.setStringAsync(code);
    haptics.success();
    setCopied(true);
  };

  const share = () =>
    Share.share({ message: `Join my Manhunt match! Code: ${code}` });

  return (
    <Card style={styles.card}>
      <Pressable
        onPress={copy}
        accessibilityRole="button"
        accessibilityLabel={`Code ${code}. Tap to copy`}
        hitSlop={spacing.sm}
      >
        <AppText
          style={[typography.mono, styles.code, { color: c.text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {code}
        </AppText>
      </Pressable>

      <View style={styles.actions}>
        <Button
          title={copied ? 'Copied' : 'Copy code'}
          icon={copied ? 'checkmark' : 'copy-outline'}
          onPress={() => void copy()}
          style={styles.action}
        />
        <Button
          title="Share"
          icon="share-outline"
          variant="secondary"
          onPress={() => void share()}
          style={styles.action}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: spacing.lg },
  code: { fontSize: 44, lineHeight: 54, letterSpacing: 8, paddingLeft: 8 },
  actions: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' },
  action: { flex: 1 },
});
