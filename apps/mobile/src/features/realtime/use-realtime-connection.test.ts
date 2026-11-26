import { renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { authApi } from '@/features/auth/auth.api';
import { useSession } from '@/features/auth/session.store';
import { signInAs } from '@/test-utils/stores';
import { useRealtime } from './realtime.store';
import { createGameSocket } from './socket';
import { useRealtimeConnection } from './use-realtime-connection';

jest.mock('@/features/auth/auth.api');
jest.mock('./socket', () => ({
  ...jest.requireActual('./socket'),
  createGameSocket: jest.fn(),
}));

/** Just enough of a Socket.IO client: `connect` succeeds right away. */
class FakeSocket {
  connected = false;
  private handlers: Record<string, ((...args: any[]) => void)[]> = {};
  on(event: string, handler: (...args: any[]) => void) {
    (this.handlers[event] ??= []).push(handler);
    return this;
  }
  fire(event: string, ...args: unknown[]) {
    for (const handler of this.handlers[event] ?? []) handler(...args);
  }
  connect = jest.fn(() => {
    this.connected = true;
    this.fire('connect');
  });
  disconnect = jest.fn(() => {
    this.connected = false;
    this.fire('disconnect', 'io client disconnect');
  });
  removeAllListeners = jest.fn(() => {
    this.handlers = {};
  });
}

let socket: FakeSocket;
let changeAppState: (state: AppStateStatus) => void;
const expire = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  jest.clearAllMocks();
  socket = new FakeSocket();
  jest.mocked(createGameSocket).mockReturnValue(socket as never);
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
    changeAppState = listener;
    return { remove: jest.fn() };
  });
  signInAs('ana');
  useSession.setState({ expire });
});

describe('useRealtimeConnection', () => {
  it('opens one socket for the session and closes it when the session ends', async () => {
    const { unmount } = await renderHook(() => useRealtimeConnection());

    expect(createGameSocket).toHaveBeenCalledWith('token');
    expect(useRealtime.getState()).toMatchObject({
      socket,
      status: 'connected',
    });

    await unmount();
    expect(socket.disconnect).toHaveBeenCalled();
    expect(useRealtime.getState()).toEqual({ socket: null, status: 'offline' });
  });

  it('expires the session when the server rejects the token', async () => {
    await renderHook(() => useRealtimeConnection());
    socket.fire('connect_error', new Error('UNAUTHORIZED'));
    expect(expire).toHaveBeenCalled();
  });

  it('reconnects after a server disconnect if the session is still valid', async () => {
    jest.mocked(authApi.me).mockResolvedValue({} as never);
    await renderHook(() => useRealtimeConnection());
    socket.connect.mockClear();

    socket.connected = false;
    socket.fire('disconnect', 'io server disconnect');
    expect(useRealtime.getState().status).toBe('reconnecting');

    await new Promise(process.nextTick);
    expect(authApi.me).toHaveBeenCalled();
    expect(socket.connect).toHaveBeenCalled();
  });

  it("doesn't reconnect if that session ended", async () => {
    jest.mocked(authApi.me).mockImplementation(async () => {
      useSession.setState({ status: 'signedOut' }); // what a 401 does
      throw new Error('Unauthorized');
    });
    await renderHook(() => useRealtimeConnection());
    socket.connect.mockClear();

    socket.fire('disconnect', 'io server disconnect');
    await new Promise(process.nextTick);
    expect(socket.connect).not.toHaveBeenCalled();
  });

  it('disconnects in the background and reconnects on return', async () => {
    await renderHook(() => useRealtimeConnection());

    changeAppState('background');
    expect(socket.disconnect).toHaveBeenCalled();
    expect(useRealtime.getState().status).toBe('offline');

    changeAppState('active');
    expect(useRealtime.getState().status).toBe('connected');
  });
});
