import {
  type CatchResult,
  type MatchDto,
  type MatchFinishedPayload,
  type MatchSnapshot,
  MatchStatus,
  type PingNoticePayload,
  type PingRevealPayload,
  type PlayerCaughtPayload,
  PlayerStatus,
  type PositionDto,
} from '@manhunt/types';
import { create } from 'zustand';
import { haptics } from '@/lib/haptics';
import type { DevicePosition } from '@/lib/location/device-location';
import { useRealtime } from '@/features/realtime/realtime.store';
import { emitWithAck } from '@/features/realtime/socket';
import { clockOffsetMs } from './rules/time';

/**
 * Everything about the match on screen, from the lobby to the results.
 *
 * - `useMatchConnection` fills it: every server event calls one action below.
 * - `useLocationTracking` adds the phone's position.
 * - The screens (lobby, play, results) read it with selectors:
 *     const match = useMatch((s) => s.match);
 */
export interface MatchState {
  /** Latest subscription error, to display. */
  error: string | null;
  match: MatchDto | null;
  /** My team and status. */
  me: MatchSnapshot['me'] | null;
  /** Latest position of each teammate, by userId. */
  teammates: Record<string, PositionDto>;
  /** Latest ping (hunters only). */
  lastPing: PingRevealPayload | null;
  /** When the hunters last saw me (runners only). */
  lastSpottedAt: string | null;
  lastCatch: PlayerCaughtPayload | null;
  /** The host closed the lobby, or kicked me. */
  closed: boolean;
  /** Server clock minus local clock (ms), for countdowns. */
  clockOffsetMs: number;

  /** My position, while GPS tracking is on. */
  myPosition: DevicePosition | null;
}

export interface MatchActions {
  // --- Subscription (useMatchConnection) ---
  reset: () => void;
  failed: (message: string) => void;

  // --- Server events ---
  loadSnapshot: (snapshot: MatchSnapshot, receivedAt: number) => void;
  /** A new version of the match (from the socket or a REST response). */
  updateMatch: (match: MatchDto) => void;
  teammateMoved: (position: PositionDto) => void;
  pingRevealed: (ping: PingRevealPayload) => void;
  spottedByHunters: (notice: PingNoticePayload) => void;
  playerCaught: (caught: PlayerCaughtPayload) => void;
  matchFinished: (finished: MatchFinishedPayload) => void;
  matchClosed: () => void;

  // --- Device (useLocationTracking) ---
  setMyPosition: (position: DevicePosition | null) => void;

  // --- What the player can do ---
  catchRunner: (runnerId: string) => Promise<CatchResult>;
}

const initialState: MatchState = {
  error: null,
  match: null,
  me: null,
  teammates: {},
  lastPing: null,
  lastSpottedAt: null,
  lastCatch: null,
  closed: false,
  clockOffsetMs: 0,
  myPosition: null,
};

export const useMatch = create<MatchState & MatchActions>()((set, get) => ({
  ...initialState,

  // --- Subscription -------------------------------------------------------
  reset: () => set(initialState),
  failed: (message) => set({ error: message }),

  // --- Server events ------------------------------------------------------
  loadSnapshot: (snapshot, receivedAt) =>
    set({
      error: null,
      match: snapshot.match,
      me: snapshot.me,
      teammates: Object.fromEntries(
        snapshot.teammates.map((p) => [p.userId, p]),
      ),
      lastPing: snapshot.lastPing,
      clockOffsetMs: clockOffsetMs(snapshot.serverTime, receivedAt),
    }),

  updateMatch: (match) => {
    const current = get().match;
    if (current && current.id !== match.id) return; // a late event from another match
    set(withMatch(get(), match));
  },

  teammateMoved: (position) => {
    if (position.userId === get().me?.userId) return;
    set((s) => ({
      teammates: { ...s.teammates, [position.userId]: position },
    }));
  },

  pingRevealed: (ping) => set({ lastPing: ping }),

  spottedByHunters: (notice) => {
    haptics.warning();
    set({ lastSpottedAt: notice.at });
  },

  playerCaught: (caught) => {
    const state = get();
    if (caught.runnerId === state.me?.userId) haptics.error();

    // A caught runner is no longer on the map.
    const { [caught.runnerId]: _caught, ...teammates } = state.teammates;
    const match = state.match && {
      ...state.match,
      players: state.match.players.map((p) =>
        p.userId === caught.runnerId
          ? {
              ...p,
              status: PlayerStatus.CAUGHT,
              caughtBy: caught.hunterId,
              caughtAt: caught.at,
            }
          : p,
      ),
    };
    set({
      ...(match ? withMatch(state, match) : {}),
      teammates,
      lastCatch: caught,
    });
  },

  matchFinished: (finished) => {
    const { match } = get();
    if (!match) return;
    set(
      withMatch(get(), {
        ...match,
        status: MatchStatus.FINISHED,
        winnerTeam: finished.winnerTeam,
        endedAt: finished.endedAt,
      }),
    );
  },

  matchClosed: () => set({ closed: true }),

  // --- Device -------------------------------------------------------------
  setMyPosition: (position) => set({ myPosition: position }),

  // --- What the player can do ---------------------------------------------
  catchRunner: async (runnerId) => {
    const { socket } = useRealtime.getState();
    if (!socket?.connected) throw new Error('Not connected to the server');
    const result = await emitWithAck(socket, 'catch:attempt', { runnerId });
    haptics.success();
    return result;
  },
}));

/** The loaded match. Only for the screens MatchScreen shows once it exists. */
export function useLoadedMatch(): MatchDto {
  const match = useMatch((s) => s.match);
  if (!match) throw new Error('The match has not loaded yet');
  return match;
}

/**
 * Applies a new version of the match and recomputes my team and status from it.
 * If I'm no longer among the players, I was kicked: the match counts as closed.
 */
function withMatch(state: MatchState, match: MatchDto): Partial<MatchState> {
  if (!state.me) return { match };
  const mine = match.players.find((p) => p.userId === state.me?.userId);
  if (!mine) return { match, closed: true };
  const teamChanged = mine.team !== state.me.team;
  return {
    match,
    me: { userId: mine.userId, team: mine.team, status: mine.status },
    // Teammates' positions belong to the old team.
    teammates: teamChanged ? {} : state.teammates,
  };
}
