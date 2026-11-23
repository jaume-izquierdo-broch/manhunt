import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import {
  type GameSession,
  GameSessionContext,
} from '@/features/game/session/game-session';
import type { GameState } from '@/features/game/state/game-state';

/** Renderiza una vista de partida con una sesión falsa (sin socket ni GPS). */
export async function renderWithSession(
  ui: ReactElement,
  {
    state,
    userId,
    ...overrides
  }: { state: GameState; userId: string } & Partial<GameSession>,
) {
  const session: GameSession = {
    state,
    userId,
    position: null,
    locationPermission: 'granted',
    requestLocationPermission: jest.fn(),
    applyMatch: jest.fn(),
    attemptCatch: jest.fn(),
    ...overrides,
  };
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const utils = await render(
    <QueryClientProvider client={queryClient}>
      <GameSessionContext value={session}>{ui}</GameSessionContext>
    </QueryClientProvider>,
  );
  return { ...utils, session };
}
