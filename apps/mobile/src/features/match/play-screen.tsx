import { type MatchDto, MatchStatus, PlayerStatus, Team } from '@manhunt/types';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocationAccessNotice } from '@/features/location/location-access-notice';
import { useRealtime } from '@/features/realtime/realtime.store';
import { Banner, type BannerTone, spacing, useThemeColors } from '@/ui';
import { CatchConfirmCard } from './components/catch-confirm-card';
import { CatchPanel } from './components/catch-panel';
import { MatchHud } from './components/match-hud';
import { MatchMap, type MapMarkerData } from './components/match-map';
import { HidingOverlay } from './components/hiding-overlay';
import { type MatchState, useMatch, useLoadedMatch } from './match.store';
import { isInsideArea } from './rules/geo';
import { playerName } from './rules/players';
import { msUntil } from './rules/time';
import { useServerNow } from './use-server-clock';

/** How long one-off notices (a ping, a catch) stay on screen. */
const NOTICE_DURATION_MS = 8_000;

interface Notice {
  key: string;
  tone: BannerTone;
  message: string;
}

/** The match being played (HIDING / ACTIVE): map, countdown, notices and catches. */
export function PlayScreen() {
  // The whole state: this screen shows most of it, and redraws every second anyway.
  const state = useMatch();
  const match = useLoadedMatch();
  const connected = useRealtime((s) => s.status === 'connected');
  const now = useServerNow(state.clockOffsetMs);
  const c = useThemeColors();

  const me = state.me;
  const area = match.playArea; // set when the match starts
  if (!me || !area) return null;

  const isHunter = me.team === Team.HUNTER;
  const hiding = match.status === MatchStatus.HIDING;
  const caught = me.status === PlayerStatus.CAUGHT;

  return (
    <View style={[styles.fill, { backgroundColor: c.background }]}>
      <MatchMap
        area={area}
        markers={buildMarkers(state, match, isHunter)}
        accentColor={isHunter ? c.hunter : c.runner}
      />

      <SafeAreaView
        edges={['bottom']}
        style={[StyleSheet.absoluteFill, styles.layer]}
        pointerEvents="box-none"
      >
        <View style={styles.top} pointerEvents="box-none">
          <MatchHud match={match} myTeam={me.team} now={now} />
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
              waitingFor={waitingFor(state, now)}
              onCatch={state.catchRunner}
            />
          </ScrollView>
        ) : null}

        {!isHunter && !caught && state.catchOnMe ? (
          <View style={styles.bottomContent}>
            <CatchConfirmCard
              claim={state.catchOnMe}
              hunterName={playerName(match, state.catchOnMe.hunterId)}
              now={now}
              onAnswer={state.answerCatch}
            />
          </View>
        ) : null}
      </SafeAreaView>

      {isHunter && hiding ? (
        <HidingOverlay remainingMs={msUntil(match.hidingEndsAt, now)} />
      ) : null}
    </View>
  );
}

/**
 * The runner I'm waiting on to confirm my catch. If their answer never comes
 * (it should arrive within seconds of the deadline), stop waiting.
 */
function waitingFor(state: MatchState, now: number): string | null {
  const claim = state.myCatch;
  if (!claim) return null;
  return now - Date.parse(claim.expiresAt) < 10_000 ? claim.runnerId : null;
}

/** Teammates for everyone, plus the latest ping for hunters. */
function buildMarkers(
  state: MatchState,
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
  state: MatchState,
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
  const rejected = state.lastRejectedCatch;
  if (rejected && now - rejected.at < NOTICE_DURATION_MS) {
    notices.push({
      key: `rejected-${rejected.at}`,
      tone: 'warning',
      message: `${playerName(match, rejected.runnerId)} says you didn't catch them.`,
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
  if (
    position &&
    match.playArea &&
    !caught &&
    !isInsideArea(position, match.playArea)
  ) {
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
