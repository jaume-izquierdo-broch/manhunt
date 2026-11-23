import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { matchesApi } from '@/features/matches/matches.api';
import { loadedState, makeMatch, player } from '@/test-utils/fixtures';
import { renderWithSession } from '@/test-utils/render-with-session';
import { LobbyView } from './lobby-view';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));
jest.mock('@/features/matches/matches.api');
const api = jest.mocked(matchesApi);

const balanced = makeMatch({
  players: [player('host', 'HUNTER'), player('ana', 'RUNNER')],
});

describe('LobbyView', () => {
  beforeEach(() => jest.clearAllMocks());

  it('muestra el código y las reglas de la sala', async () => {
    await renderWithSession(<LobbyView />, {
      state: loadedState(balanced, 'host'),
      userId: 'host',
    });

    expect(screen.getByText('ABC234')).toBeOnTheScreen();
    expect(screen.getByText('Duración: 30 min')).toBeOnTheScreen();
    expect(screen.getByText('Cazadores (1)')).toBeOnTheScreen();
    expect(screen.getByText('Escapadores (1)')).toBeOnTheScreen();
  });

  it('el anfitrión no puede empezar sin escapadores', async () => {
    const alone = makeMatch();
    await renderWithSession(<LobbyView />, {
      state: loadedState(alone, 'host'),
      userId: 'host',
    });

    expect(
      screen.getByRole('button', { name: 'Empezar partida' }),
    ).toBeDisabled();
    expect(
      screen.getByText('Hace falta al menos un cazador y un escapador'),
    ).toBeOnTheScreen();
  });

  it('el anfitrión empieza y la partida devuelta se aplica a la sesión', async () => {
    const started = { ...balanced, status: 'HIDING' as const };
    api.start.mockResolvedValue(started);
    const { session } = await renderWithSession(<LobbyView />, {
      state: loadedState(balanced, 'host'),
      userId: 'host',
    });

    await fireEvent.press(
      screen.getByRole('button', { name: 'Empezar partida' }),
    );

    await waitFor(() =>
      expect(session.applyMatch).toHaveBeenCalledWith(started),
    );
    expect(api.start).toHaveBeenCalledWith('m1');
  });

  it('el anfitrión cambia a un jugador de equipo', async () => {
    api.setTeam.mockResolvedValue(balanced);
    await renderWithSession(<LobbyView />, {
      state: loadedState(balanced, 'host'),
      userId: 'host',
    });

    // Fila de "ana" (escapadora): su botón la pasa a cazadora.
    await fireEvent.press(
      screen.getAllByRole('button', { name: '→ Cazador' })[0]!,
    );
    await waitFor(() =>
      expect(api.setTeam).toHaveBeenCalledWith('m1', 'ana', 'HUNTER'),
    );
  });

  it('un invitado solo puede salir: sin controles del anfitrión', async () => {
    await renderWithSession(<LobbyView />, {
      state: loadedState(balanced, 'ana'),
      userId: 'ana',
    });

    expect(
      screen.getByRole('button', { name: 'Salir de la sala' }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Empezar partida' }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Expulsar' })).toBeNull();
    expect(
      screen.getByText('Esperando a que el anfitrión empiece la partida…'),
    ).toBeOnTheScreen();
  });

  it('avisa si falta el permiso de ubicación', async () => {
    const { session } = await renderWithSession(<LobbyView />, {
      state: loadedState(balanced, 'ana'),
      userId: 'ana',
      locationPermission: 'unknown',
    });

    await fireEvent.press(
      screen.getByRole('button', { name: 'Permitir ubicación' }),
    );
    expect(session.requestLocationPermission).toHaveBeenCalled();
  });
});
