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
    screen.getByLabelText('Usuario o email'),
    identifier,
  );
  await fireEvent.changeText(screen.getByLabelText('Contraseña'), password);
}

describe('LoginForm', () => {
  it('pide usuario/email y contraseña', async () => {
    const onSubmit = jest.fn();
    await render(<LoginForm onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(screen.getByText('Escribe tu usuario o email')).toBeOnTheScreen();
    expect(screen.getByText('Escribe tu contraseña')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('acepta un email como identificador (normalizado con trim)', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<LoginForm onSubmit={onSubmit} />);

    await fill('  ana@mail.com ', 'contraseña-segura');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        identifier: 'ana@mail.com',
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
          'Usuario/email o contraseña incorrectos',
          401,
        ),
      );
    await render(<LoginForm onSubmit={onSubmit} />);

    await fill('ana', 'incorrecta');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(
      await screen.findByText('Usuario/email o contraseña incorrectos'),
    ).toBeOnTheScreen();
  });
});
