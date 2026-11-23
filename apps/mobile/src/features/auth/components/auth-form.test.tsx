import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { ApiError } from '@/lib/http/api-error';
import { AuthForm } from './auth-form';

async function fill(username: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText('Usuario'), username);
  await fireEvent.changeText(screen.getByLabelText('Contraseña'), password);
}

describe('AuthForm', () => {
  it('en registro valida con el esquema compartido y no envía datos inválidos', async () => {
    const onSubmit = jest.fn();
    await render(<AuthForm mode="register" onSubmit={onSubmit} />);

    await fill('a', '123');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(screen.getByText('Mínimo 3 caracteres')).toBeOnTheScreen();
    expect(screen.getByText('Mínimo 8 caracteres')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envía los datos ya normalizados (trim)', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<AuthForm mode="login" onSubmit={onSubmit} />);

    await fill('  ana  ', 'contraseña-segura');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        username: 'ana',
        password: 'contraseña-segura',
      }),
    );
  });

  it('muestra el mensaje del servidor si falla', async () => {
    const onSubmit = jest
      .fn()
      .mockRejectedValue(
        new ApiError(
          'INVALID_CREDENTIALS',
          'Usuario o contraseña incorrectos',
          401,
        ),
      );
    await render(<AuthForm mode="login" onSubmit={onSubmit} />);

    await fill('ana', 'incorrecta');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(
      await screen.findByText('Usuario o contraseña incorrectos'),
    ).toBeOnTheScreen();
  });
});
