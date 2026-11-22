import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AuthResponse } from '@manhunt/types';
import { randomBytes } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { setupApp } from '../../src/app.setup.js';
import { type ClientSocket, connectSocket } from './socket.js';

export const PASSWORD = 'contraseña-segura';
/** Plaza de referencia para las coordenadas de los tests. */
export const PLAZA = { lat: 41.387, lng: 2.17 };

export const uniqueName = (prefix: string) =>
  `${prefix}_${randomBytes(5).toString('hex')}`;

/** Cliente HTTP autenticado. */
export type ApiClient = ReturnType<typeof apiClient>;

function apiClient(app: INestApplication, token?: string) {
  const server = app.getHttpServer();
  const auth = (req: request.Test) =>
    token ? req.set('Authorization', `Bearer ${token}`) : req;
  return {
    get: (url: string) => auth(request(server).get(url)),
    post: (url: string, body?: object) =>
      auth(request(server).post(url)).send(body),
    patch: (url: string, body: object) =>
      auth(request(server).patch(url)).send(body),
    delete: (url: string) => auth(request(server).delete(url)),
  };
}

export interface TestPlayer extends AuthResponse {
  api: ApiClient;
  connect: () => Promise<ClientSocket>;
}

/**
 * Arranca la API completa (con Postgres y Redis reales) una vez por archivo
 * de tests y cierra sockets al acabar cada test.
 */
export function useTestApp() {
  let app: INestApplication;
  let baseUrl = '';
  const sockets: ClientSocket[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await setupApp(app);
    await app.listen(0);
    const { port } = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(() => {
    for (const socket of sockets.splice(0)) socket.disconnect();
  });

  afterAll(async () => {
    await app?.close();
  });

  const connect = async (token: string) => {
    const socket = await connectSocket(baseUrl, token);
    sockets.push(socket);
    return socket;
  };

  return {
    /** Cliente sin token. */
    anonymous: () => apiClient(app),
    connect,

    /** Registra un usuario nuevo y devuelve su token, su cliente HTTP y un conector WS. */
    async register(prefix = 'user'): Promise<TestPlayer> {
      const res = await apiClient(app)
        .post('/auth/register', {
          username: uniqueName(prefix),
          password: PASSWORD,
        })
        .expect(201);
      const auth = res.body as AuthResponse;
      return {
        ...auth,
        api: apiClient(app, auth.accessToken),
        connect: () => connect(auth.accessToken),
      };
    },
  };
}
