import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from './button';

describe('Button', () => {
  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await render(<Button title="Create match" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Create match' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores presses while disabled', async () => {
    const onPress = jest.fn();
    await render(<Button title="Start" onPress={onPress} disabled />);

    const button = screen.getByRole('button', { name: 'Start' });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a spinner and ignores presses while loading', async () => {
    const onPress = jest.fn();
    await render(<Button title="Log in" onPress={onPress} loading />);

    const button = screen.getByRole('button', { name: 'Log in' });
    expect(button).toBeBusy();
    expect(screen.queryByText('Log in')).toBeNull();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
