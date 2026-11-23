import { type MatchDto, Team } from '@manhunt/types';
import { useRouter } from 'expo-router';
import { Alert, Share, StyleSheet, View } from 'react-native';
import {
  useCloseMatch,
  useKickPlayer,
  useLeaveMatch,
  useSetTeam,
  useStartMatch,
} from '@/features/matches/matches.queries';
import { formatDistance, formatDuration } from '@/lib/format';
import { errorMessage } from '@/lib/http/api-error';
import {
  AppText,
  Banner,
  Button,
  Card,
  Screen,
  spacing,
  typography,
} from '@/ui';
import { PlayerRow } from '../components/player-row';
import { useGameSession, useLoadedMatch } from '../session/game-session';
import { hasBalancedTeams, playersOfTeam } from '../state/game-state';

/** Sala de espera: código para invitar, equipos y controles del anfitrión. */
export function LobbyView() {
  const { userId, applyMatch, locationPermission, requestLocationPermission } =
    useGameSession();
  const match = useLoadedMatch();
  const router = useRouter();
  const isHost = match.hostId === userId;

  const setTeam = useSetTeam(match.id);
  const kick = useKickPlayer(match.id);
  const start = useStartMatch(match.id);
  const leave = useLeaveMatch(match.id);
  const close = useCloseMatch(match.id);

  /** Ejecuta una acción del anfitrión y aplica la partida devuelta. */
  const run = async (failTitle: string, action: () => Promise<MatchDto>) => {
    try {
      applyMatch(await action());
    } catch (error) {
      Alert.alert(failTitle, errorMessage(error));
    }
  };

  const exit = (
    title: string,
    message: string,
    action: () => Promise<unknown>,
  ) =>
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: title,
        style: 'destructive',
        onPress: async () => {
          try {
            await action();
            router.replace('/');
          } catch (error) {
            Alert.alert('No se ha podido completar', errorMessage(error));
          }
        },
      },
    ]);

  const share = () =>
    Share.share({
      message: `¡Únete a mi partida de Manhunt! Código: ${match.joinCode}`,
    });

  const balanced = hasBalancedTeams(match);

  const teamSection = (team: Team) => {
    const players = playersOfTeam(match, team);
    const other = team === Team.HUNTER ? Team.RUNNER : Team.HUNTER;
    return (
      <Card>
        <AppText
          variant="label"
          tone={team === Team.HUNTER ? 'hunter' : 'runner'}
        >
          {team === Team.HUNTER ? 'Cazadores' : 'Escapadores'} ({players.length}
          )
        </AppText>
        {players.length === 0 ? (
          <AppText variant="caption" tone="muted">
            Nadie todavía
          </AppText>
        ) : null}
        {players.map((player) => (
          <PlayerRow
            key={player.userId}
            player={player}
            isMe={player.userId === userId}
            isHost={player.userId === match.hostId}
            actions={
              isHost ? (
                <>
                  <Button
                    title={team === Team.HUNTER ? '→ Escapador' : '→ Cazador'}
                    variant="secondary"
                    compact
                    onPress={() =>
                      run('No se pudo cambiar el equipo', () =>
                        setTeam.mutateAsync({
                          userId: player.userId,
                          team: other,
                        }),
                      )
                    }
                  />
                  {player.userId !== userId ? (
                    <Button
                      title="Expulsar"
                      variant="ghost"
                      compact
                      onPress={() =>
                        run('No se pudo expulsar', () =>
                          kick.mutateAsync(player.userId),
                        )
                      }
                    />
                  ) : null}
                </>
              ) : undefined
            }
          />
        ))}
      </Card>
    );
  };

  return (
    <Screen
      scroll
      footer={
        isHost ? (
          <>
            {!balanced ? (
              <AppText variant="caption" tone="muted" center>
                Hace falta al menos un cazador y un escapador
              </AppText>
            ) : null}
            <Button
              title="Empezar partida"
              disabled={!balanced}
              loading={start.isPending}
              onPress={() =>
                run('No se pudo empezar', () => start.mutateAsync())
              }
            />
            <Button
              title="Cerrar sala"
              variant="ghost"
              onPress={() =>
                exit('Cerrar sala', 'Se expulsará a todos los jugadores.', () =>
                  close.mutateAsync(),
                )
              }
            />
          </>
        ) : (
          <>
            <AppText variant="caption" tone="muted" center>
              Esperando a que el anfitrión empiece la partida…
            </AppText>
            <Button
              title="Salir de la sala"
              variant="secondary"
              onPress={() =>
                exit('Salir', '¿Seguro que quieres salir?', () =>
                  leave.mutateAsync(),
                )
              }
            />
          </>
        )
      }
    >
      <Card style={styles.codeCard}>
        <AppText variant="caption" tone="muted">
          Código de la sala
        </AppText>
        <AppText
          style={typography.mono}
          accessibilityLabel={`Código ${match.joinCode}`}
          selectable
        >
          {match.joinCode}
        </AppText>
        <Button
          title="Compartir código"
          variant="secondary"
          compact
          onPress={share}
        />
      </Card>

      <Card>
        <AppText variant="label">Reglas de esta partida</AppText>
        <View style={styles.rules}>
          <AppText variant="caption">
            Zona: radio de {formatDistance(match.playArea.radiusMeters)}
          </AppText>
          <AppText variant="caption">
            Escondite: {formatDuration(match.hidingSeconds)}
          </AppText>
          <AppText variant="caption">
            Duración: {formatDuration(match.durationSeconds)}
          </AppText>
          <AppText variant="caption">
            Ping a los cazadores: cada{' '}
            {formatDuration(match.pingIntervalSeconds)}
          </AppText>
        </View>
      </Card>

      {locationPermission !== 'granted' ? (
        <View style={styles.permission}>
          <Banner
            tone="warning"
            message="Necesitarás la ubicación activada para jugar. Concédela ahora para no perder tiempo al empezar."
          />
          <Button
            title="Permitir ubicación"
            variant="secondary"
            compact
            onPress={requestLocationPermission}
          />
        </View>
      ) : null}

      {teamSection(Team.HUNTER)}
      {teamSection(Team.RUNNER)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  codeCard: { alignItems: 'center' },
  rules: { gap: spacing.xs },
  permission: { gap: spacing.sm },
});
