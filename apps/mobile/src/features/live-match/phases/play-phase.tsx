import { type MatchDto, MatchStatus, PlayerStatus, Team } from '@manhunt/types';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocationAccessNotice } from '@/features/location/location-access-notice';
import { useRealtime } from '@/features/realtime/realtime.store';
import { Banner, type BannerTone, spacing, useThemeColors } from '@/ui';
import { CatchPanel } from '../components/catch-panel';
import { GameHud } from '../components/game-hud';
import { GameMap, type MapMarkerData } from '../components/game-map';
import { HidingOverlay } from '../components/hiding-overlay';
import {
  type LiveMatchState,
  useLiveMatch,
  useLoadedMatch,
} from '../live-match.store';
import { isInsideArea } from '../rules/geo';
import { playerName } from '../rules/players';
import { msUntil } from '../rules/time';
import { useServerNow } from '../use-server-clock';

/** How long one-off notices (a ping, a catch) stay on screen. */
const NOTICE_DURATION_MS = 8_000;

interface Notice {
  key: string;
  tone: BannerTone;
  message: string;
}

/** The match being played (HIDING / ACTIVE): map, countdown, notices and catches. */
export function PlayPhase() {
  // The whole state: this screen shows most of it, and redraws every second anyway.
  const state = useLiveMatch();
  const match = useLoadedMatch();
  const connected = useRealtime((s) => s.status === 'connected');
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
          {buildNotices(state, match, now, connected).map((notice) => (
            <Banner
              key={notice.key}
              tone={notice.tone}
              message={notice.message}
            />
          ))}
          {isHunter || !caught ? (
            <LocationAccessNotice
              tone="danger"
              askMessage="You can't play without location access."
            />
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
              myPosition={state.myPosition}
              onCatch={state.catchRunner}
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
  state: LiveMatchState,
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

/** One-off and ongoing warnings shown under the HUD. */
function buildNotices(
  state: LiveMatchState,
  match: MatchDto,
  now: number,
  connected: boolean,
): Notice[] {
  const { me, myPosition: position } = state;
  if (!me) return [];
  const caught = me.status === PlayerStatus.CAUGHT;
  const isRecent = (iso: string | null | undefined) =>
    !!iso && now - Date.parse(iso) < NOTICE_DURATION_MS;

  const notices: Notice[] = [];
  if (!connected) {
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
  if (me.team === Team.RUNNER && !caught && isRecent(state.lastSpottedAt)) {
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
