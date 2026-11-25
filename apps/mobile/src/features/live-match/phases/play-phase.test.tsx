import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { GameState } from '@/features/game/state/game-state';
import { loadedState, makeMatch, player } from '@/test-utils/fixtures';
import { renderWithSession } from '@/test-utils/render-with-session';
import { PlayView } from './play-view';

const fromNow = (ms: number) => new Date(Date.now() + ms).toISOString();

const liveMatch = (
  status: 'HIDING' | 'ACTIVE',
  runnerStatus: 'ALIVE' | 'CAUGHT' = 'ALIVE',
) =>
  makeMatch({
    status,
    startedAt: new Date().toISOString(),
    hidingEndsAt: fromNow(status === 'HIDING' ? 90_000 : -1_000),
    endsAt: fromNow(600_000),
    players: [
      player('host', 'HUNTER'),
      player('ana', 'RUNNER', { status: runnerStatus }),
    ],
  });

const renderAs = (
  userId: string,
  match: ReturnType<typeof liveMatch>,
  state: Partial<GameState> = {},
  extra = {},
) =>
  renderWithSession(<PlayView />, {
    state: loadedState(match, userId, state),
    userId,
    ...extra,
  });

describe('PlayView', () => {
  it('hides the map from hunters during the hiding phase', async () => {
    await renderAs('host', liveMatch('HIDING'));

    expect(screen.getByText('The runners are hiding')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Catch' })).toBeNull();
  });

  it('shows runners the countdown to the hunt', async () => {
    await renderAs('ana', liveMatch('HIDING'));

    expect(screen.getByText('The hunt starts in')).toBeOnTheScreen();
    expect(screen.getByText('Runner')).toBeOnTheScreen();
    expect(screen.queryByText('The runners are hiding')).toBeNull();
  });

  it('lets hunters catch during the hunt', async () => {
    const attemptCatch = jest.fn().mockResolvedValue({});
    await renderAs('host', liveMatch('ACTIVE'), {}, { attemptCatch });

    expect(screen.getByText('Not located yet')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Catch' }));
    await waitFor(() => expect(attemptCatch).toHaveBeenCalledWith('ana'));
  });

  it('turns a caught runner into a spectator', async () => {
    await renderAs('ana', liveMatch('ACTIVE', 'CAUGHT'));

    expect(
      screen.getByText("You've been caught. You're now a spectator."),
    ).toBeOnTheScreen();
  });

  it('warns runners right after a ping', async () => {
    await renderAs('ana', liveMatch('ACTIVE'), {
      lastNoticeAt: new Date().toISOString(),
    });

    expect(
      screen.getByText('📡 The hunters just saw your position!'),
    ).toBeOnTheScreen();
  });

  it('warns when the connection drops', async () => {
    await renderAs('ana', liveMatch('ACTIVE'), { connection: 'reconnecting' });

    expect(
      screen.getByText('Connection lost. Reconnecting…'),
    ).toBeOnTheScreen();
  });
});
