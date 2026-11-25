// Helpers to put the app's stores in a known state before rendering a screen.
import type { MatchDto } from '@manhunt/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { useSession } from '@/features/auth/session.store';
import {
  type LiveMatchActions,
  type LiveMatchState,
  useLiveMatch,
} from '@/features/live-match/live-match.store';

/** Signs in a fake user whose id and username are `userId`. */
export function signInAs(userId: string) {
  useSession.setState({
    status: 'signedIn',
    token: 'token',
    user: {
      id: userId,
      username: userId,
      email: `${userId}@mail.com`,
      createdAt: '2026-11-23T10:00:00.000Z',
    },
  });
}

/**
 * Shows `match` as seen by `userId`, connected and loaded. `extra` overrides any
 * state or action, e.g. `{ catchRunner: jest.fn() }`.
 */
export function showLiveMatch(
  match: MatchDto,
  userId: string,
  extra: Partial<LiveMatchState & LiveMatchActions> = {},
) {
  signInAs(userId);
  const mine = match.players.find((p) => p.userId === userId)!;
  useLiveMatch.getState().reset();
  useLiveMatch.setState({
    connection: 'connected',
    match,
    me: { userId, team: mine.team, status: mine.status },
    locationPermission: 'granted',
    ...extra,
  });
}

/** Renders with a fresh React Query client (for screens that call the API). */
export function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}
