import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useCurrentUser, useSession } from '@/features/auth/session.store';
import {
  AppText,
  Avatar,
  Button,
  ListRow,
  ListSection,
  Screen,
  spacing,
} from '@/ui';

const APP_VERSION = Constants.expoConfig?.version ?? '—';

/** "2026-11-23T…" -> "November 2026". */
const memberSince = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

/** The user's account: profile, legal info and signing out. */
export function SettingsScreen() {
  const { user } = useCurrentUser();
  const signOut = useSession((s) => s.signOut);
  const router = useRouter();

  return (
    <Screen
      scroll
      footer={
        <Button
          title="Log out"
          variant="danger"
          onPress={() => void signOut()}
        />
      }
    >
      <View style={styles.profile}>
        <Avatar name={user.username} size={72} />
        <AppText variant="subtitle">{user.username}</AppText>
        <AppText tone="muted">{user.email}</AppText>
      </View>

      <ListSection title="Account">
        <ListRow label="Username" value={user.username} icon="person-outline" />
        <ListRow label="Email" value={user.email} icon="mail-outline" />
        <ListRow
          label="Member since"
          value={memberSince(user.createdAt)}
          icon="calendar-outline"
        />
      </ListSection>

      <ListSection title="About">
        <ListRow
          label="Privacy policy and terms"
          icon="shield-checkmark-outline"
          accessibilityRole="link"
          onPress={() => router.push('/privacy')}
        />
        <ListRow
          label="Version"
          value={APP_VERSION}
          icon="information-circle-outline"
        />
      </ListSection>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
});
