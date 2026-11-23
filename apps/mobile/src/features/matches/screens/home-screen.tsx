import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useCurrentUser, useSession } from '@/features/auth/session-provider';
import { errorMessage } from '@/lib/http/api-error';
import { AppText, Banner, Button, Card, spacing, useThemeColors } from '@/ui';
import { CurrentMatchCard } from '../components/current-match-card';
import { goToMatch } from '../match-navigation';
import { useCurrentMatch } from '../matches.queries';

const HOW_TO_PLAY = [
  '🏃 Runners get a few minutes to hide inside the play area.',
  '📡 Every so often, the hunters get a “ping” with the runners’ positions.',
  '🫳 To catch a runner, a hunter must be within a few meters and tap “Catch”.',
  '🏁 Hunters win if they catch everyone; otherwise the runners win.',
];

export function HomeScreen() {
  const { user } = useCurrentUser();
  const { signOut } = useSession();
  const router = useRouter();
  const c = useThemeColors();
  const current = useCurrentMatch();
  const openMatch = current.data;

  // Refresh whenever the screen gains focus (e.g. coming back from a match).
  const { refetch } = current;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Button
              title="Log out"
              variant="ghost"
              compact
              onPress={() => void signOut()}
            />
          ),
        }}
      />
      <ScrollView
        style={{ backgroundColor: c.background }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={current.isRefetching}
            onRefresh={() => void refetch()}
          />
        }
      >
        <AppText variant="title">Hi, {user.username}</AppText>

        {current.isError ? (
          <Banner tone="danger" message={errorMessage(current.error)} />
        ) : null}

        {openMatch ? (
          <CurrentMatchCard
            match={openMatch}
            onOpen={() => goToMatch(router, openMatch.id)}
          />
        ) : (
          <Card>
            <AppText variant="subtitle">Ready to play?</AppText>
            <Button
              title="Create match"
              onPress={() => router.push('/create')}
            />
            <Button
              title="Join with a code"
              variant="secondary"
              onPress={() => router.push('/join')}
            />
          </Card>
        )}

        <Card>
          <AppText variant="label">How to play</AppText>
          {HOW_TO_PLAY.map((rule) => (
            <AppText key={rule} variant="caption">
              {rule}
            </AppText>
          ))}
        </Card>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
});
