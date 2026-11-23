import { MatchStatus, PlayerStatus, Team } from '@manhunt/types';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banner, Button, spacing, useThemeColors } from '@/ui';
import { CatchPanel } from '../components/catch-panel';
import { GameHud } from '../components/game-hud';
import { GameMap } from '../components/game-map';
import type { MapMarkerData } from '../components/game-map.types';
import { HidingOverlay } from '../components/hiding-overlay';
import { isInsideArea } from '../domain/geo';
import { msUntil } from '../domain/time';
import { useServerNow } from '../hooks/use-server-now';
import { useGameSession, useLoadedMatch } from '../session/game-session';
import { playerName } from '../state/game-state';

/** Avisos efímeros (ping, captura) visibles durante unos segundos. */
const FLASH_MS = 8_000;

/** Partida en juego (HIDING / ACTIVE): mapa, cuenta atrás, avisos y capturas. */
export function PlayView() {
  const session = useGameSession();
  const { state, position } = session;
  const match = useLoadedMatch();
  const now = useServerNow(state.clockOffsetMs);
  const c = useThemeColors();

  const me = state.me;
  if (!me) return null;

  const isHunter = me.team === Team.HUNTER;
  const hiding = match.status === MatchStatus.HIDING;
  const caught = me.status === PlayerStatus.CAUGHT;
  const recently = (iso: string | null | undefined) =>
    !!iso && now - Date.parse(iso) < FLASH_MS;

  const markers: MapMarkerData[] = [
    ...Object.values(state.teammates).map((p) => ({
      id: p.userId,
      lat: p.lat,
      lng: p.lng,
      title: playerName(match, p.userId),
      description: 'Compañero',
      kind: 'teammate' as const,
    })),
    ...(isHunter && state.lastPing
      ? state.lastPing.runners.map((p) => ({
          id: p.userId,
          lat: p.lat,
          lng: p.lng,
          title: playerName(match, p.userId),
          description: 'Último ping',
          kind: 'ping' as const,
        }))
      : []),
  ];

  const banners: {
    key: string;
    tone: 'info' | 'warning' | 'danger' | 'success';
    message: string;
  }[] = [];
  if (state.connection !== 'connected') {
    banners.push({
      key: 'conn',
      tone: 'warning',
      message: 'Sin conexión. Reconectando…',
    });
  }
  if (caught) {
    banners.push({
      key: 'caught',
      tone: 'danger',
      message: 'Te han capturado. Ahora eres espectador.',
    });
  }
  if (!isHunter && !caught && recently(state.lastNoticeAt)) {
    banners.push({
      key: 'notice',
      tone: 'warning',
      message: '📡 ¡Los cazadores acaban de ver tu posición!',
    });
  }
  if (state.lastCatch && recently(state.lastCatch.at)) {
    const { hunterId, runnerId } = state.lastCatch;
    banners.push({
      key: `catch-${runnerId}`,
      tone: 'info',
      message: `${playerName(match, hunterId)} ha capturado a ${playerName(match, runnerId)}`,
    });
  }
  if (position && !caught && !isInsideArea(position, match.playArea)) {
    banners.push({
      key: 'out',
      tone: 'warning',
      message: 'Estás fuera de la zona de juego.',
    });
  }

  return (
    <View style={[styles.fill, { backgroundColor: c.background }]}>
      <GameMap
        area={match.playArea}
        markers={markers}
        accentColor={isHunter ? c.hunter : c.runner}
      />

      <SafeAreaView
        edges={['bottom']}
        style={[StyleSheet.absoluteFill, styles.layer]}
        pointerEvents="box-none"
      >
        <View style={styles.top} pointerEvents="box-none">
          <GameHud match={match} myTeam={me.team} now={now} />
          {banners.map((b) => (
            <Banner key={b.key} tone={b.tone} message={b.message} />
          ))}
          {session.locationPermission === 'denied' ? (
            <>
              <Banner
                tone="danger"
                message="Sin permiso de ubicación no puedes jugar."
              />
              <Button
                title="Permitir ubicación"
                variant="secondary"
                compact
                onPress={session.requestLocationPermission}
              />
            </>
          ) : null}
        </View>

        {isHunter && !hiding && !caught ? (
          <ScrollView
            style={styles.bottom}
            contentContainerStyle={styles.bottomContent}
          >
            <CatchPanel
              match={match}
              lastPing={state.lastPing}
              myPosition={position}
              onCatch={session.attemptCatch}
            />
          </ScrollView>
        ) : null}
      </SafeAreaView>

      {isHunter && hiding ? (
        <HidingOverlay remainingMs={msUntil(match.hidingEndsAt, now)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  layer: { justifyContent: 'space-between' },
  top: { padding: spacing.md, gap: spacing.sm },
  bottom: { maxHeight: '40%', flexGrow: 0 },
  bottomContent: { padding: spacing.md },
});
