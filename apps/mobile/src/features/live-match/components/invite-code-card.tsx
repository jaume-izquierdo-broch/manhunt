import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { haptics } from '@/lib/haptics';
import {
  AppText,
  Button,
  Card,
  radius,
  spacing,
  typography,
  useThemeColors,
} from '@/ui';

const COPIED_FOR_MS = 2_000;

/** The lobby's code, one character per tile, with copy and share. */
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
      <AppText variant="caption" tone="muted" style={styles.label}>
        INVITE CODE
      </AppText>

      <Pressable
        onPress={copy}
        accessibilityRole="button"
        accessibilityLabel={`Code ${code}. Tap to copy`}
        style={styles.tiles}
      >
        {code.split('').map((char, index) => (
          <View
            key={index}
            style={[
              styles.tile,
              { backgroundColor: c.surfaceAlt, borderColor: c.border },
            ]}
          >
            <AppText style={typography.mono}>{char}</AppText>
          </View>
        ))}
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
  label: { letterSpacing: 1.2, fontWeight: '700' },
  tiles: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' },
  tile: {
    flex: 1,
    aspectRatio: 0.8,
    maxHeight: 64,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' },
  action: { flex: 1 },
});
