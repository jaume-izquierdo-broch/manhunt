import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { ApiError } from '@/lib/http/api-error';
import { LoginForm } from './login-form';

async function fill(identifier: string, password: string) {
  await fireEvent.changeText(
    screen.getByLabelText('Username or email'),
    identifier,
  );
  await fireEvent.changeText(screen.getByLabelText('Password'), password);
}

const submit = () =>
  fireEvent.press(screen.getByRole('button', { name: 'Log in' }));

describe('LoginForm', () => {
  it('requires a username/email and a password', async () => {
    const onSubmit = jest.fn();
    await render(<LoginForm onSubmit={onSubmit} />);

    await submit();

    expect(screen.getByText('Enter your username or email')).toBeOnTheScreen();
    expect(screen.getByText('Enter your password')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('accepts an email as the identifier, trimmed', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<LoginForm onSubmit={onSubmit} />);

    await fill('  ana@mail.com ', 'correct-horse-battery');
    await submit();

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        identifier: 'ana@mail.com',
        password: 'correct-horse-battery',
      }),
    );
  });

  it('shows the server message when login fails', async () => {
    const message = 'Incorrect username/email or password';
    const onSubmit = jest
      .fn()
      .mockRejectedValue(new ApiError('INVALID_CREDENTIALS', message, 401));
    await render(<LoginForm onSubmit={onSubmit} />);

    await fill('ana', 'wrong-password');
    await submit();

    expect(await screen.findByText(message)).toBeOnTheScreen();
  });
});
