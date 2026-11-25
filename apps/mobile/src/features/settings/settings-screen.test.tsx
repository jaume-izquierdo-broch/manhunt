import { fireEvent, render, screen } from '@testing-library/react-native';
import { useSession } from '@/features/auth/session.store';
import { signInAs } from '@/test-utils/stores';
import { SettingsScreen } from './settings-screen';

const mockPush = jest.fn();
const mockSignOut = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    signInAs('ana');
    useSession.setState({ signOut: mockSignOut });
  });

  it('shows the profile and account details', async () => {
    await render(<SettingsScreen />);

    expect(screen.getAllByText('ana').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ana@mail.com').length).toBeGreaterThan(0);
    expect(screen.getByText('November 2026')).toBeOnTheScreen();
  });

  it('logs out', async () => {
    await render(<SettingsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Log out' }));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('opens the privacy policy', async () => {
    await render(<SettingsScreen />);
    await fireEvent.press(
      screen.getByRole('link', { name: 'Privacy policy and terms' }),
    );
    expect(mockPush).toHaveBeenCalledWith('/privacy');
  });
});
