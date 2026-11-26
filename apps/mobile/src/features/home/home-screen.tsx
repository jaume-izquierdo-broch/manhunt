import { JOIN_CODE_LENGTH } from '@manhunt/types';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { errorMessage } from '@/lib/http/api-error';
import {
  ActionCard,
  AppText,
  Banner,
  Card,
  Icon,
  IconBadge,
  type IconName,
  SectionTitle,
  spacing,
  type ThemeColors,
  useThemeColors,
} from '@/ui';
import { CurrentMatchCard } from './components/current-match-card';
import {
  goToMatch,
  handleMatchEntryError,
} from '@/features/matches/match-navigation';
import { useCreateLobby } from '@/features/lobby/lobby.queries';
import { useCurrentMatch } from '@/features/matches/matches.queries';

const HOW_TO_PLAY: {
  icon: IconName;
  color: keyof ThemeColors;
  title: string;
  text: string;
}[] = [
  {
    icon: 'footsteps-outline',
    color: 'runner',
    title: 'Hide',
    text: 'Runners get a head start to hide inside the play area.',
  },
  {
    icon: 'radio-outline',
    color: 'primary',
    title: 'Ping',
    text: 'Every few minutes, the hunters see where the runners are.',
  },
  {
    icon: 'hand-left-outline',
    color: 'hunter',
    title: 'Catch',
    text: 'Get within a few meters of a runner and tap “Catch”.',
  },
  {
    icon: 'trophy-outline',
    color: 'warning',
    title: 'Win',
    text: 'Hunters win by catching everyone; runners win if time runs out.',
  },
];

/** Home: the current match or the ways to start one, plus the rules. */
export function HomeScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const current = useCurrentMatch();
  const openMatch = current.data;
  const create = useCreateLobby();

  const createLobby = async () => {
    try {
      const match = await create.mutateAsync();
      goToMatch(router, match.id);
    } catch (error) {
      const message = handleMatchEntryError(router, error);
      if (message) Alert.alert('Could not create the match', message);
    }
  };

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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Settings"
              hitSlop={12}
              onPress={() => router.push('/settings')}
            >
              <Icon name="settings-outline" size={24} />
            </Pressable>
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
        {current.isError ? (
          <Banner tone="danger" message={errorMessage(current.error)} />
        ) : null}

        <View style={styles.section}>
          {openMatch ? (
            <>
              <SectionTitle>Your match</SectionTitle>
              <CurrentMatchCard
                match={openMatch}
                onOpen={() => goToMatch(router, openMatch.id)}
              />
            </>
          ) : (
            <>
              <SectionTitle>Play</SectionTitle>
              <ActionCard
                prominent
                icon="add"
                title="Create a match"
                description="Invite your friends and set the rules"
                busy={create.isPending}
                onPress={() => void createLobby()}
              />
              <ActionCard
                icon="keypad-outline"
                title="Join a match"
                description={`Enter the ${JOIN_CODE_LENGTH}-character code from the host`}
                onPress={() => router.push('/join')}
              />
            </>
          )}
        </View>

        <View style={styles.section}>
          <SectionTitle>How to play</SectionTitle>
          <Card style={styles.rules}>
            {HOW_TO_PLAY.map((step) => (
              <View key={step.title} style={styles.step}>
                <IconBadge name={step.icon} color={step.color} size={40} />
                <View style={styles.stepText}>
                  <AppText variant="label">{step.title}</AppText>
                  <AppText variant="caption" tone="muted">
                    {step.text}
                  </AppText>
                </View>
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl },
  section: { gap: spacing.sm },
  rules: { gap: spacing.lg },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepText: { flex: 1, gap: 2 },
});
