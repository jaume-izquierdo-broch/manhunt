import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AuthResponse } from '@manhunt/types';
import { randomBytes } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { setupApp } from '../../src/app.setup.js';
import { type ClientSocket, connectSocket } from './socket.js';

export const PASSWORD = 'correct-horse-battery';

/** Reference point for test coordinates. */
export const ORIGIN = { lat: 41.387, lng: 2.17 };

/** ~111 km per degree of latitude. */
export const metersNorth = (meters: number) => ({
  lat: ORIGIN.lat + meters / 111_000,
  lng: ORIGIN.lng,
});

export const uniqueName = (prefix: string) =>
  `${prefix}_${randomBytes(5).toString('hex')}`;

/** A valid `POST /auth/register` body for the given username. */
export const registration = (username: string) => ({
  username,
  email: `${username}@test.manhunt`,
  password: PASSWORD,
  acceptTerms: true,
});

export type ApiClient = ReturnType<typeof apiClient>;

function apiClient(app: INestApplication, token?: string) {
  const server = app.getHttpServer();
  const withAuth = (req: request.Test) =>
    token ? req.set('Authorization', `Bearer ${token}`) : req;
  return {
    get: (url: string) => withAuth(request(server).get(url)),
    post: (url: string, body?: object) =>
      withAuth(request(server).post(url)).send(body),
    patch: (url: string, body: object) =>
      withAuth(request(server).patch(url)).send(body),
    delete: (url: string) => withAuth(request(server).delete(url)),
  };
}

export interface TestPlayer extends AuthResponse {
  api: ApiClient;
  connect: () => Promise<ClientSocket>;
}

/**
 * Boots the full API (against real Postgres and Redis) once per test file and
 * disconnects any open sockets after each test.
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
    setupApp(app);
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
    /** An HTTP client without a token. */
    anonymous: () => apiClient(app),
    connect,

    /** Registers a new user and returns their token, an HTTP client and a socket connector. */
    async register(prefix = 'user'): Promise<TestPlayer> {
      const res = await apiClient(app)
        .post('/auth/register', registration(uniqueName(prefix)))
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
