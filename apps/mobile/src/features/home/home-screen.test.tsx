import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Location from 'expo-location';
import type { ReactNode } from 'react';
import { makeMatch } from '@/test-utils/fixtures';
import { useCreateLobby } from '@/features/lobby/lobby.queries';
import { useCurrentMatch } from '@/features/match/match.queries';
import { HomeScreen } from './home-screen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    dismissTo: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
  // Renders the header button so it can be tested with the screen.
  Stack: {
    Screen: ({ options }: { options: { headerRight?: () => ReactNode } }) =>
      options.headerRight?.() ?? null,
  },
}));
jest.mock('@/features/match/match.queries');
jest.mock('@/features/lobby/lobby.queries');
const currentMatch = jest.mocked(useCurrentMatch);
const createLobby = jest.fn();
jest.mocked(useCreateLobby).mockReturnValue({
  mutateAsync: createLobby,
  isPending: false,
} as unknown as ReturnType<typeof useCreateLobby>);

function withCurrentMatch(data: ReturnType<typeof makeMatch> | null) {
  currentMatch.mockReturnValue({
    data,
    isError: false,
    error: null,
    isRefetching: false,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useCurrentMatch>);
}

const permission = jest.mocked(Location.getForegroundPermissionsAsync);
const request = jest.mocked(Location.requestForegroundPermissionsAsync);
const locationAnswer = (status: string) =>
  ({ status, canAskAgain: true }) as never;

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    permission.mockResolvedValue(locationAnswer('granted'));
    request.mockResolvedValue(locationAnswer('granted'));
  });

  it('offers to create or join a match and explains the rules', async () => {
    withCurrentMatch(null);
    await render(<HomeScreen />);

    createLobby.mockResolvedValue(makeMatch());
    await fireEvent.press(
      screen.getByRole('button', { name: 'Create a match' }),
    );
    expect(createLobby).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/match/[id]',
      params: { id: 'm1' },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Join a match' }));
    expect(mockPush).toHaveBeenCalledWith('/join');

    for (const step of ['Hide', 'Ping', 'Catch', 'Win']) {
      expect(screen.getByText(step)).toBeOnTheScreen();
    }
  });

  it('does not create a match without the location', async () => {
    permission.mockResolvedValue(locationAnswer('undetermined'));
    request.mockResolvedValue(locationAnswer('denied'));
    withCurrentMatch(null);
    await render(<HomeScreen />);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Create a match' }),
    );

    expect(request).toHaveBeenCalled();
    expect(createLobby).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('reopens the open match only with the location', async () => {
    withCurrentMatch(makeMatch());
    await render(<HomeScreen />);
    const backToLobby = screen.getByRole('button', {
      name: 'Back to the lobby',
    });

    permission.mockResolvedValue(locationAnswer('undetermined'));
    request.mockResolvedValue(locationAnswer('denied'));
    await fireEvent.press(backToLobby);
    expect(mockPush).not.toHaveBeenCalled();

    request.mockResolvedValue(locationAnswer('granted'));
    await fireEvent.press(backToLobby);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/match/[id]',
      params: { id: 'm1' },
    });
  });

  it('shows the open match instead of the create and join actions', async () => {
    withCurrentMatch(makeMatch());
    await render(<HomeScreen />);

    expect(screen.getByText('PLAY')).toBeOnTheScreen();
    expect(screen.getByText('You have an open match')).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Create a match' }),
    ).not.toBeOnTheScreen();
  });

  it('opens the settings from the header', async () => {
    withCurrentMatch(null);
    await render(<HomeScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Settings' }));
    expect(mockPush).toHaveBeenCalledWith('/settings');
  });
});
