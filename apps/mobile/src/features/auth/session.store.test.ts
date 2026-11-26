import type { AuthResponse } from '@manhunt/types';
import { ApiError } from '@/lib/http/api-error';
import { authApi } from './auth.api';
import { sessionStorage } from './session-storage';
import { useSession } from './session.store';

jest.mock('./auth.api');
const api = jest.mocked(authApi);

const auth: AuthResponse = {
  accessToken: 'token-1',
  user: {
    id: 'u1',
    username: 'ana',
    email: 'ana@mail.com',
    createdAt: '2026-11-23T10:00:00.000Z',
  },
};
const credentials = { identifier: 'ana', password: 'secret123' };

const session = () => useSession.getState();

beforeEach(async () => {
  jest.clearAllMocks();
  api.login.mockResolvedValue(auth);
  api.register.mockResolvedValue(auth);
  api.logout.mockResolvedValue(undefined);
  await sessionStorage.clear();
  useSession.setState({ status: 'loading', token: null, user: null });
});

describe('session store', () => {
  it('starts signed out when nothing is saved', async () => {
    await session().restore();
    expect(session().status).toBe('signedOut');
  });

  it('logIn saves the session, and restore brings it back', async () => {
    await session().logIn(credentials);
    expect(api.login).toHaveBeenCalledWith(credentials);
    expect(session()).toMatchObject({ status: 'signedIn', token: 'token-1' });

    useSession.setState({ status: 'loading', token: null, user: null });
    api.me.mockResolvedValue({ ...auth.user, username: 'ana_renamed' });
    await session().restore();

    expect(session().token).toBe('token-1');
    // The background check refreshes the user.
    expect(session().user?.username).toBe('ana_renamed');
  });

  it('register signs in with the new account', async () => {
    const values = {
      username: 'ana',
      email: 'ana@mail.com',
      password: 'secret123',
      acceptTerms: true as const,
    };
    await session().register(values);

    expect(api.register).toHaveBeenCalledWith(values);
    expect(session().status).toBe('signedIn');
    expect(await sessionStorage.load()).toEqual(auth);
  });

  it('a failed logIn leaves the user signed out and rethrows', async () => {
    useSession.setState({ status: 'signedOut' });
    api.login.mockRejectedValue(
      new ApiError('INVALID_CREDENTIALS', 'Wrong credentials', 401),
    );

    await expect(session().logIn(credentials)).rejects.toThrow(
      'Wrong credentials',
    );
    expect(session().status).toBe('signedOut');
    expect(await sessionStorage.load()).toBeNull();
  });

  it('stays signed in offline: the background check can fail', async () => {
    await sessionStorage.save(auth);
    api.me.mockRejectedValue(ApiError.network());

    await session().restore();

    expect(session()).toMatchObject({ status: 'signedIn', user: auth.user });
  });

  it('logOut revokes the token on the server and forgets it here', async () => {
    await session().logIn(credentials);
    await session().logOut();

    expect(api.logout).toHaveBeenCalledWith('token-1');
    expect(session()).toMatchObject({ status: 'signedOut', token: null });
    expect(await sessionStorage.load()).toBeNull();
  });

  it('expire forgets the session without calling the server', async () => {
    await session().logIn(credentials);
    await session().expire();

    expect(api.logout).not.toHaveBeenCalled();
    expect(session().status).toBe('signedOut');
    expect(await sessionStorage.load()).toBeNull();
  });
});
