import { type MatchDto, MatchStatus, PlayerStatus, Team } from '@manhunt/types';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DevicePosition } from '@/lib/location/device-location';
import { Banner, type BannerTone, Button, spacing, useThemeColors } from '@/ui';
import { CatchPanel } from '../components/catch-panel';
import { GameHud } from '../components/game-hud';
import { GameMap } from '../components/game-map';
import type { MapMarkerData } from '../components/game-map.types';
import { HidingOverlay } from '../components/hiding-overlay';
import { isInsideArea } from '../domain/geo';
import { msUntil } from '../domain/time';
import { useServerNow } from '../hooks/use-server-now';
import { useGameSession, useLoadedMatch } from '../session/game-session';
import { type GameState, playerName } from '../state/game-state';

/** How long one-off notices (a ping, a catch) stay on screen. */
const NOTICE_DURATION_MS = 8_000;

interface Notice {
  key: string;
  tone: BannerTone;
  message: string;
}

/** The match being played (HIDING / ACTIVE): map, countdown, notices and catches. */
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

  return (
    <View style={[styles.fill, { backgroundColor: c.background }]}>
      <GameMap
        area={match.playArea}
        markers={buildMarkers(state, match, isHunter)}
        accentColor={isHunter ? c.hunter : c.runner}
      />

      <SafeAreaView
        edges={['bottom']}
        style={[StyleSheet.absoluteFill, styles.layer]}
        pointerEvents="box-none"
      >
        <View style={styles.top} pointerEvents="box-none">
          <GameHud match={match} myTeam={me.team} now={now} />
          {buildNotices(state, match, position, now).map((notice) => (
            <Banner
              key={notice.key}
              tone={notice.tone}
              message={notice.message}
            />
          ))}
          {session.locationPermission === 'denied' ? (
            <>
              <Banner
                tone="danger"
                message="You can't play without location access."
              />
              <Button
                title="Allow location"
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

/** Teammates for everyone, plus the latest ping for hunters. */
function buildMarkers(
  state: GameState,
  match: MatchDto,
  isHunter: boolean,
): MapMarkerData[] {
  const teammates = Object.values(state.teammates).map((p) => ({
    id: p.userId,
    lat: p.lat,
    lng: p.lng,
    title: playerName(match, p.userId),
    description: 'Teammate',
    kind: 'teammate' as const,
  }));
  const pinged =
    isHunter && state.lastPing
      ? state.lastPing.runners.map((p) => ({
          id: p.userId,
          lat: p.lat,
          lng: p.lng,
          title: playerName(match, p.userId),
          description: 'Last ping',
          kind: 'ping' as const,
        }))
      : [];
  return [...teammates, ...pinged];
}

function buildNotices(
  state: GameState,
  match: MatchDto,
  position: DevicePosition | null,
  now: number,
): Notice[] {
  const me = state.me;
  if (!me) return [];
  const caught = me.status === PlayerStatus.CAUGHT;
  const isRecent = (iso: string | null | undefined) =>
    !!iso && now - Date.parse(iso) < NOTICE_DURATION_MS;

  const notices: Notice[] = [];
  if (state.connection !== 'connected') {
    notices.push({
      key: 'connection',
      tone: 'warning',
      message: 'Connection lost. Reconnecting…',
    });
  }
  if (caught) {
    notices.push({
      key: 'caught',
      tone: 'danger',
      message: "You've been caught. You're now a spectator.",
    });
  }
  if (me.team === Team.RUNNER && !caught && isRecent(state.lastNoticeAt)) {
    notices.push({
      key: 'ping',
      tone: 'warning',
      message: '📡 The hunters just saw your position!',
    });
  }
  if (state.lastCatch && isRecent(state.lastCatch.at)) {
    const { hunterId, runnerId } = state.lastCatch;
    notices.push({
      key: `catch-${runnerId}`,
      tone: 'info',
      message: `${playerName(match, hunterId)} caught ${playerName(match, runnerId)}`,
    });
  }
  if (position && !caught && !isInsideArea(position, match.playArea)) {
    notices.push({
      key: 'outside',
      tone: 'warning',
      message: "You're outside the play area.",
    });
  }
  return notices;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  layer: { justifyContent: 'space-between' },
  top: { padding: spacing.md, gap: spacing.sm },
  bottom: { maxHeight: '40%', flexGrow: 0 },
  bottomContent: { padding: spacing.md },
});
