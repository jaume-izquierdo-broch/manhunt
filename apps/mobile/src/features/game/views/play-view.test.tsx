import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { loadedState, makeMatch, player } from '@/test-utils/fixtures';
import { renderWithSession } from '@/test-utils/render-with-session';
import { PlayView } from './play-view';

const inFuture = (ms: number) => new Date(Date.now() + ms).toISOString();

const match = (
  status: 'HIDING' | 'ACTIVE',
  runnerStatus: 'ALIVE' | 'CAUGHT' = 'ALIVE',
) =>
  makeMatch({
    status,
    startedAt: new Date().toISOString(),
    hidingEndsAt: inFuture(status === 'HIDING' ? 90_000 : -1_000),
    endsAt: inFuture(600_000),
    players: [
      player('host', 'HUNTER'),
      player('ana', 'RUNNER', { status: runnerStatus }),
    ],
  });

describe('PlayView', () => {
  it('el cazador no ve el mapa durante el escondite', async () => {
    const m = match('HIDING');
    await renderWithSession(<PlayView />, {
      state: loadedState(m, 'host'),
      userId: 'host',
    });

    expect(
      screen.getByText('Los escapadores se están escondiendo'),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Capturar' })).toBeNull();
  });

  it('el escapador ve la cuenta atrás hasta la caza', async () => {
    const m = match('HIDING');
    await renderWithSession(<PlayView />, {
      state: loadedState(m, 'ana'),
      userId: 'ana',
    });

    expect(screen.getByText('La caza empieza en')).toBeOnTheScreen();
    expect(screen.getByText('Escapador')).toBeOnTheScreen();
    expect(
      screen.queryByText('Los escapadores se están escondiendo'),
    ).toBeNull();
  });

  it('durante la caza el cazador puede capturar', async () => {
    const m = match('ACTIVE');
    const attemptCatch = jest.fn().mockResolvedValue({});
    await renderWithSession(<PlayView />, {
      state: loadedState(m, 'host'),
      userId: 'host',
      attemptCatch,
    });

    expect(screen.getByText('Sin localizar todavía')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Capturar' }));
    await waitFor(() => expect(attemptCatch).toHaveBeenCalledWith('ana'));
  });

  it('el escapador capturado pasa a espectador', async () => {
    const m = match('ACTIVE', 'CAUGHT');
    await renderWithSession(<PlayView />, {
      state: loadedState(m, 'ana'),
      userId: 'ana',
    });

    expect(
      screen.getByText('Te han capturado. Ahora eres espectador.'),
    ).toBeOnTheScreen();
  });

  it('avisa al escapador cuando le acaban de localizar', async () => {
    const m = match('ACTIVE');
    await renderWithSession(<PlayView />, {
      state: loadedState(m, 'ana', { lastNoticeAt: new Date().toISOString() }),
      userId: 'ana',
    });

    expect(
      screen.getByText('📡 ¡Los cazadores acaban de ver tu posición!'),
    ).toBeOnTheScreen();
  });

  it('avisa si se pierde la conexión', async () => {
    const m = match('ACTIVE');
    await renderWithSession(<PlayView />, {
      state: loadedState(m, 'ana', { connection: 'reconnecting' }),
      userId: 'ana',
    });

    expect(screen.getByText('Sin conexión. Reconectando…')).toBeOnTheScreen();
  });
});
