import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useCurrentUser, useSession } from '@/features/auth/session-provider';
import { errorMessage } from '@/lib/http/api-error';
import { AppText, Banner, Button, Card, spacing, useThemeColors } from '@/ui';
import { CurrentMatchCard } from '../components/current-match-card';
import { goToMatch } from '../match-navigation';
import { useCurrentMatch } from '../matches.queries';

export function HomeScreen() {
  const { user } = useCurrentUser();
  const { signOut } = useSession();
  const router = useRouter();
  const c = useThemeColors();
  const current = useCurrentMatch();

  // Al volver a esta pantalla (p. ej. desde una partida), se refresca.
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
              title="Salir"
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
        <AppText variant="title">Hola, {user.username}</AppText>

        {current.isError ? (
          <Banner tone="danger" message={errorMessage(current.error)} />
        ) : null}

        {current.data ? (
          <CurrentMatchCard
            match={current.data}
            onOpen={() => goToMatch(router, current.data!.id)}
          />
        ) : (
          <Card>
            <AppText variant="subtitle">¿Jugamos?</AppText>
            <Button
              title="Crear partida"
              onPress={() => router.push('/create')}
            />
            <Button
              title="Unirse con código"
              variant="secondary"
              onPress={() => router.push('/join')}
            />
          </Card>
        )}

        <Card>
          <AppText variant="label">Cómo se juega</AppText>
          <AppText variant="caption">
            🏃 Los escapadores tienen unos minutos para esconderse dentro de la
            zona.
          </AppText>
          <AppText variant="caption">
            📡 Cada cierto tiempo, los cazadores reciben un “ping” con su
            posición.
          </AppText>
          <AppText variant="caption">
            🫳 Para capturar, el cazador tiene que estar a pocos metros y pulsar
            “Capturar”.
          </AppText>
          <AppText variant="caption">
            🏁 Ganan los cazadores si atrapan a todos; si no, ganan los
            escapadores.
          </AppText>
        </Card>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
});
