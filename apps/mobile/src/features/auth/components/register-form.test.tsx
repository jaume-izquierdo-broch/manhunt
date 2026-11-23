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

const TERMS =
  'He leído y acepto la política de privacidad y las condiciones de uso';

async function fill(values: {
  username?: string;
  email?: string;
  password?: string;
  confirm?: string;
}) {
  const fields: [string, string | undefined][] = [
    ['Usuario', values.username],
    ['Email', values.email],
    ['Contraseña', values.password],
    ['Repite la contraseña', values.confirm],
  ];
  for (const [label, value] of fields) {
    if (value !== undefined) {
      await fireEvent.changeText(screen.getByLabelText(label), value);
    }
  }
}

const submit = () =>
  fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));

describe('RegisterForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('valida todos los campos con el esquema compartido', async () => {
    const onSubmit = jest.fn();
    await render(<RegisterForm onSubmit={onSubmit} />);

    await fill({
      username: 'a',
      email: 'no-es-email',
      password: '123',
      confirm: '456',
    });
    await submit();

    expect(screen.getByText('Mínimo 3 caracteres')).toBeOnTheScreen();
    expect(screen.getByText('Email no válido')).toBeOnTheScreen();
    expect(screen.getByText('Las contraseñas no coinciden')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Debes aceptar la política de privacidad y las condiciones',
      ),
    ).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envía lo que espera la API, sin la confirmación de contraseña', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<RegisterForm onSubmit={onSubmit} />);

    await fill({
      username: 'ana',
      email: ' Ana@Mail.com ',
      password: 'contraseña-segura',
      confirm: 'contraseña-segura',
    });
    const checkbox = screen.getByRole('checkbox', { name: TERMS });
    await fireEvent.press(checkbox);
    expect(checkbox).toBeChecked();
    await submit();

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        username: 'ana',
        email: 'ana@mail.com',
        password: 'contraseña-segura',
        acceptTerms: true,
      }),
    );
  });

  it('un email ya registrado se muestra en su campo', async () => {
    const onSubmit = jest
      .fn()
      .mockRejectedValue(
        new ApiError('EMAIL_TAKEN', 'Ya existe una cuenta con ese email', 409),
      );
    await render(<RegisterForm onSubmit={onSubmit} />);

    await fill({
      username: 'ana',
      email: 'ana@mail.com',
      password: 'contraseña-segura',
      confirm: 'contraseña-segura',
    });
    await fireEvent.press(screen.getByRole('checkbox', { name: TERMS }));
    await submit();

    expect(
      await screen.findByText('Ya existe una cuenta con ese email'),
    ).toBeOnTheScreen();
  });

  it('enlaza a la política de privacidad', async () => {
    await render(<RegisterForm onSubmit={jest.fn()} />);
    await fireEvent.press(
      screen.getByRole('link', {
        name: 'Leer la política de privacidad y las condiciones',
      }),
    );
    expect(mockPush).toHaveBeenCalledWith('/privacy');
  });
});
