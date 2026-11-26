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

const memberSince = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export function SettingsScreen() {
  const { user } = useCurrentUser();
  const logOut = useSession((s) => s.logOut);
  const router = useRouter();

  return (
    <Screen
      scroll
      footer={
        <Button
          title="Log out"
          variant="danger"
          onPress={() => void logOut()}
        />
      }
    >
      <View style={styles.profile}>
        <Avatar name={user.username} size={72} />
        <AppText variant="subtitle">{user.username}</AppText>
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
