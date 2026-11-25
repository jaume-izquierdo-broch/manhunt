import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { matchesApi } from '@/features/matches/matches.api';
import { loadedState, makeMatch, player } from '@/test-utils/fixtures';
import { renderWithSession } from '@/test-utils/render-with-session';
import { LobbyView } from './lobby-view';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));
jest.mock('@/features/matches/matches.api');
const api = jest.mocked(matchesApi);

const balanced = makeMatch({
  players: [player('host', 'HUNTER'), player('ana', 'RUNNER')],
});

const renderAs = (userId: string, match = balanced, extra = {}) =>
  renderWithSession(<LobbyView />, {
    state: loadedState(match, userId),
    userId,
    ...extra,
  });

describe('LobbyView', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the code, the rules and both teams', async () => {
    await renderAs('host');

    expect(screen.getByText('ABC234')).toBeOnTheScreen();
    expect(screen.getByText('Duration: 30 min')).toBeOnTheScreen();
    expect(screen.getByText('Hunters (1)')).toBeOnTheScreen();
    expect(screen.getByText('Runners (1)')).toBeOnTheScreen();
  });

  it('the host cannot start without runners', async () => {
    await renderAs('host', makeMatch());

    expect(screen.getByRole('button', { name: 'Start match' })).toBeDisabled();
    expect(
      screen.getByText('You need at least one hunter and one runner'),
    ).toBeOnTheScreen();
  });

  it('the host starts the match and the returned match is applied', async () => {
    const started = { ...balanced, status: 'HIDING' as const };
    api.start.mockResolvedValue(started);
    const { session } = await renderAs('host');

    await fireEvent.press(screen.getByRole('button', { name: 'Start match' }));

    await waitFor(() =>
      expect(session.applyMatch).toHaveBeenCalledWith(started),
    );
    expect(api.start).toHaveBeenCalledWith('m1');
  });

  it('the host moves a player to the other team', async () => {
    api.setTeam.mockResolvedValue(balanced);
    await renderAs('host');

    // Only "ana" is a runner, so there is a single "→ Hunter" button.
    await fireEvent.press(screen.getByRole('button', { name: '→ Hunter' }));
    await waitFor(() =>
      expect(api.setTeam).toHaveBeenCalledWith('m1', 'ana', 'HUNTER'),
    );
  });

  it('a guest can only leave: no host controls', async () => {
    await renderAs('ana');

    expect(
      screen.getByRole('button', { name: 'Leave lobby' }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Start match' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Kick' })).toBeNull();
    expect(
      screen.getByText('Waiting for the host to start the match…'),
    ).toBeOnTheScreen();
  });

  it('asks for location permission when missing', async () => {
    const { session } = await renderAs('ana', balanced, {
      locationPermission: 'unknown',
    });

    await fireEvent.press(
      screen.getByRole('button', { name: 'Allow location' }),
    );
    expect(session.requestLocationPermission).toHaveBeenCalled();
  });
});
