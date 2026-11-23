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
  configureApiAuth({ getToken: () => 'tok', onUnauthorized: jest.fn() });
});

describe('api client', () => {
  it('envía JSON con el token y devuelve el cuerpo', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: 1 }));

    await expect(api.post('/matches', { a: 1 })).resolves.toEqual({ ok: 1 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/matches');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"a":1}');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer tok',
      'Content-Type': 'application/json',
    });
  });

  it('no envía token en rutas públicas', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    await api.post('/auth/login', {}, { auth: false });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('204 devuelve undefined', async () => {
    fetchMock.mockResolvedValue(jsonResponse(204));
    await expect(api.post('/matches/x/leave')).resolves.toBeUndefined();
  });

  it('convierte el error del servidor en ApiError con su código y detalles', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(409, {
        statusCode: 409,
        code: 'ALREADY_IN_MATCH',
        message: 'Ya estás en otra partida',
        details: { matchId: 'm1' },
      }),
    );

    const error = (await api.post('/matches').catch((e) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'ALREADY_IN_MATCH', status: 409 });
    expect(error.message).toBe('Ya estás en otra partida');
    expect(error.openMatchId).toBe('m1');
  });

  it('un fallo de red se convierte en NETWORK_ERROR', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    await expect(api.get('/health')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      status: 0,
    });
  });

  it('un 401 con token cierra la sesión', async () => {
    const onUnauthorized = jest.fn();
    configureApiAuth({ getToken: () => 'caducado', onUnauthorized });
    fetchMock.mockResolvedValue(
      jsonResponse(401, { code: 'UNAUTHORIZED', message: 'x' }),
    );

    await expect(api.get('/auth/me')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('un 401 en el login no cierra ninguna sesión', async () => {
    const onUnauthorized = jest.fn();
    configureApiAuth({ getToken: () => 'tok', onUnauthorized });
    fetchMock.mockResolvedValue(
      jsonResponse(401, { code: 'INVALID_CREDENTIALS', message: 'x' }),
    );

    await expect(
      api.post('/auth/login', {}, { auth: false }),
    ).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
