import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from './button';

describe('Button', () => {
  it('llama a onPress al pulsarlo', async () => {
    const onPress = jest.fn();
    await render(<Button title="Crear partida" onPress={onPress} />);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Crear partida' }),
    );
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('deshabilitado no responde', async () => {
    const onPress = jest.fn();
    await render(<Button title="Empezar" onPress={onPress} disabled />);

    const button = screen.getByRole('button', { name: 'Empezar' });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('cargando muestra el indicador y no responde', async () => {
    const onPress = jest.fn();
    await render(<Button title="Entrar" onPress={onPress} loading />);

    const button = screen.getByRole('button', { name: 'Entrar' });
    expect(button).toBeBusy();
    expect(screen.queryByText('Entrar')).toBeNull();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
