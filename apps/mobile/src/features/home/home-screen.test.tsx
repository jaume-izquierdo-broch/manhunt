import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { makeMatch } from '@/test-utils/fixtures';
import { useCreateLobby } from '@/features/lobby/lobby.queries';
import { useCurrentMatch } from '@/features/matches/matches.queries';
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
jest.mock('@/features/matches/matches.queries');
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

describe('HomeScreen', () => {
  beforeEach(() => jest.clearAllMocks());

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

  it('shows the open match instead of the create and join actions', async () => {
    withCurrentMatch(makeMatch());
    await render(<HomeScreen />);

    expect(screen.getByText('YOUR MATCH')).toBeOnTheScreen();
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
