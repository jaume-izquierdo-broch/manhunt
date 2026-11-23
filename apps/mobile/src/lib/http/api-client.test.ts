import { api, configureApiAuth, setApiBaseUrl } from './api-client';
import { ApiError } from './api-error';

const fetchMock = jest.fn();

function jsonResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  setApiBaseUrl('http://api.test');
  configureApiAuth({ getToken: () => 'token', onUnauthorized: jest.fn() });
});

describe('api client', () => {
  it('sends JSON with the token and returns the body', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: 1 }));

    await expect(api.post('/matches', { a: 1 })).resolves.toEqual({ ok: 1 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/matches');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"a":1}');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer token',
      'Content-Type': 'application/json',
    });
  });

  it('sends no token to public routes', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    await api.post('/auth/login', {}, { auth: false });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('returns undefined for 204', async () => {
    fetchMock.mockResolvedValue(jsonResponse(204));
    await expect(api.post('/matches/x/leave')).resolves.toBeUndefined();
  });

  it('turns a server error into an ApiError with its code and details', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(409, {
        statusCode: 409,
        code: 'ALREADY_IN_MATCH',
        message: 'You are already in another match',
        details: { matchId: 'm1' },
      }),
    );

    const error = (await api.post('/matches').catch((e) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'ALREADY_IN_MATCH', status: 409 });
    expect(error.message).toBe('You are already in another match');
    expect(error.openMatchId).toBe('m1');
  });

  it('turns a network failure into NETWORK_ERROR', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    await expect(api.get('/health')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      status: 0,
    });
  });

  it('signs out on a 401 for an authenticated request', async () => {
    const onUnauthorized = jest.fn();
    configureApiAuth({ getToken: () => 'expired', onUnauthorized });
    fetchMock.mockResolvedValue(
      jsonResponse(401, { code: 'UNAUTHORIZED', message: 'x' }),
    );

    await expect(api.get('/auth/me')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not sign out on a 401 from the login itself', async () => {
    const onUnauthorized = jest.fn();
    configureApiAuth({ getToken: () => 'token', onUnauthorized });
    fetchMock.mockResolvedValue(
      jsonResponse(401, { code: 'INVALID_CREDENTIALS', message: 'x' }),
    );

    await expect(
      api.post('/auth/login', {}, { auth: false }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('sends an explicit token and does not sign out on its 401', async () => {
    const onUnauthorized = jest.fn();
    configureApiAuth({ getToken: () => null, onUnauthorized });
    fetchMock.mockResolvedValue(
      jsonResponse(401, { code: 'UNAUTHORIZED', message: 'x' }),
    );

    await expect(
      api.post('/auth/logout', undefined, { token: 'old' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer old');
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
