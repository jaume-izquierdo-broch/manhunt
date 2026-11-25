import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { ApiError } from '@/lib/http/api-error';
import { RegisterForm } from './register-form';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const PASSWORD = 'correct-horse-battery';

async function fill(values: {
  username?: string;
  email?: string;
  password?: string;
  confirm?: string;
}) {
  const fields: [string, string | undefined][] = [
    ['Username', values.username],
    ['Email', values.email],
    ['Password', values.password],
    ['Confirm password', values.confirm],
  ];
  for (const [label, value] of fields) {
    if (value !== undefined) {
      await fireEvent.changeText(screen.getByLabelText(label), value);
    }
  }
}

const termsCheckbox = () =>
  screen.getByRole('checkbox', {
    name: 'I accept the privacy policy and terms of use',
  });
const submit = () =>
  fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

describe('RegisterForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('validates every field with the shared schema', async () => {
    const onSubmit = jest.fn();
    await render(<RegisterForm onSubmit={onSubmit} />);

    await fill({
      username: 'a',
      email: 'not-an-email',
      password: '123',
      confirm: '456',
    });
    await submit();

    expect(screen.getByText('At least 3 characters')).toBeOnTheScreen();
    expect(screen.getByText('Invalid email')).toBeOnTheScreen();
    expect(screen.getByText('Passwords do not match')).toBeOnTheScreen();
    expect(
      screen.getByText('You must accept the privacy policy and terms of use'),
    ).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the API body, without the password confirmation', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<RegisterForm onSubmit={onSubmit} />);

    await fill({
      username: 'ana',
      email: ' Ana@Mail.com ',
      password: PASSWORD,
      confirm: PASSWORD,
    });
    await fireEvent.press(termsCheckbox());
    expect(termsCheckbox()).toBeChecked();
    await submit();

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        username: 'ana',
        email: 'ana@mail.com',
        password: PASSWORD,
        acceptTerms: true,
      }),
    );
  });

  it('shows a taken email under the email field', async () => {
    const message = 'An account with that email already exists';
    const onSubmit = jest
      .fn()
      .mockRejectedValue(new ApiError('EMAIL_TAKEN', message, 409));
    await render(<RegisterForm onSubmit={onSubmit} />);

    await fill({
      username: 'ana',
      email: 'ana@mail.com',
      password: PASSWORD,
      confirm: PASSWORD,
    });
    await fireEvent.press(termsCheckbox());
    await submit();

    expect(await screen.findByText(message)).toBeOnTheScreen();
  });

  it('links to the privacy policy', async () => {
    await render(<RegisterForm onSubmit={jest.fn()} />);
    await fireEvent.press(
      screen.getByRole('link', {
        name: 'privacy policy and terms of use',
      }),
    );
    expect(mockPush).toHaveBeenCalledWith('/privacy');
    // Opening the policy doesn't accept it.
    expect(termsCheckbox()).not.toBeChecked();
  });

  it('tapping the sentence also ticks the box', async () => {
    await render(<RegisterForm onSubmit={jest.fn()} />);
    await fireEvent.press(
      screen.getByText('I accept the privacy policy and terms of use'),
    );
    expect(termsCheckbox()).toBeChecked();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
