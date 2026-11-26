import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import { useMatch } from '@/features/match/match.store';
import { matchApi } from '@/features/match/match.api';
import { makeMatch, player } from '@/test-utils/fixtures';
import { renderWithQueryClient, showMatch } from '@/test-utils/stores';
import { lobbyApi } from './lobby.api';
import { LobbyScreen } from './lobby-screen';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
    dismissTo: jest.fn(),
  }),
}));
jest.mock('@/features/match/match.api');
jest.mock('./lobby.api');
const api = jest.mocked(matchApi);
const lobby = jest.mocked(lobbyApi);

const here = (distanceFromHostMeters: number | null) => ({
  distanceFromHostMeters,
  accuracy: 5,
  at: new Date().toISOString(),
});

const balanced = makeMatch({
  players: [
    player('host', 'HUNTER', { lobbyLocation: here(null) }),
    player('ana', 'RUNNER', { lobbyLocation: here(40) }),
  ],
});

function renderAs(
  userId: string,
  match = balanced,
  extra: Parameters<typeof showMatch>[2] = {},
) {
  showMatch(match, userId, extra);
  return renderWithQueryClient(<LobbyScreen />);
}

describe('LobbyScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the code, the rules and both teams', async () => {
    await renderAs('host');

    expect(screen.getByLabelText('Code ABC234. Tap to copy')).toBeOnTheScreen();
    expect(screen.getByLabelText('Hunt: 30 min')).toBeOnTheScreen();
    expect(screen.getByText('Hunters')).toBeOnTheScreen();
    expect(screen.getByText('Runners')).toBeOnTheScreen();
    expect(screen.getByText('PLAYERS · 2')).toBeOnTheScreen();
  });

  it('copies the code', async () => {
    await renderAs('ana');

    await fireEvent.press(screen.getByRole('button', { name: 'Copy code' }));

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('ABC234');
    expect(
      await screen.findByRole('button', { name: 'Copied' }),
    ).toBeOnTheScreen();
  });

  it('the host cannot start without runners', async () => {
    await renderAs('host', makeMatch());

    expect(screen.getByRole('button', { name: 'Start match' })).toBeDisabled();
  });

  it('the host starts the match where they are', async () => {
    const started = { ...balanced, status: 'HIDING' as const };
    api.start.mockResolvedValue(started);
    await renderAs('host', balanced, {
      myPosition: { lat: 41.4, lng: 2.18, accuracy: 8, at: Date.now() },
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Start match' }));

    await waitFor(() =>
      expect(useMatch.getState().match?.status).toBe('HIDING'),
    );
    expect(api.start).toHaveBeenCalledWith('m1', {
      lat: 41.4,
      lng: 2.18,
      accuracy: 8,
    });
  });

  it('shows who is ready and waits for everyone to be in range', async () => {
    await renderAs(
      'host',
      makeMatch({
        players: [
          player('host', 'HUNTER', { lobbyLocation: here(null) }),
          player('ana', 'RUNNER', { lobbyLocation: here(40) }),
          player('marc', 'RUNNER', { lobbyLocation: here(1500) }),
          player('lia', 'RUNNER'),
        ],
      }),
    );

    expect(screen.getByText('Ready · 40 m from the host')).toBeOnTheScreen();
    expect(
      screen.getByText('1.5 km away · outside the area'),
    ).toBeOnTheScreen();
    expect(screen.getByText('No location yet')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Start match' })).toBeDisabled();
  });

  it('the host changes the rules', async () => {
    lobby.updateSettings.mockResolvedValue({ ...balanced, radiusMeters: 500 });
    await renderAs('host');

    await fireEvent.press(
      screen.getByRole('button', { name: 'Area radius: 400 m' }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'More' }));
    await fireEvent.press(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByText('About 13 min to walk across.')).toBeOnTheScreen();
    expect(lobby.updateSettings).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));

    await waitFor(() =>
      expect(lobby.updateSettings).toHaveBeenCalledWith('m1', {
        radiusMeters: 500,
        hidingSeconds: 120,
        durationSeconds: 1800,
        pingIntervalSeconds: 120,
      }),
    );
    await waitFor(() =>
      expect(useMatch.getState().match?.radiusMeters).toBe(500),
    );
  });

  it('the host moves a player to the other team', async () => {
    lobby.setTeam.mockResolvedValue(balanced);
    await renderAs('host');

    await fireEvent.press(
      screen.getByRole('button', { name: 'Move to hunters: ana' }),
    );
    await waitFor(() =>
      expect(lobby.setTeam).toHaveBeenCalledWith('m1', 'ana', 'HUNTER'),
    );
  });

  it('a guest can only leave: no host controls', async () => {
    await renderAs('ana');

    expect(
      screen.getByRole('button', { name: 'Leave lobby' }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Start match' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Kick/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Move to/ })).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Area radius: 400 m' }),
    ).toBeNull();
    expect(
      screen.getByText('Waiting for the host to start the match…'),
    ).toBeOnTheScreen();
  });

  it('asks for location permission when missing', async () => {
    const notAsked = { status: 'undetermined', canAskAgain: true };
    jest
      .mocked(Location.getForegroundPermissionsAsync)
      .mockResolvedValue(notAsked as never);
    await renderAs('ana');

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Allow location' }),
    );
    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
  });
});
