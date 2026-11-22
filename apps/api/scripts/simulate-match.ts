// Simula una partida completa contra una API en marcha y va narrando lo que pasa.
//
//   pnpm --filter @manhunt/api simulate
//   API_URL=http://localhost:3100 pnpm --filter @manhunt/api simulate
//
// Crea dos usuarios nuevos (cazador y escapador), monta la sala, empieza,
// mueve al escapador, espera un ping, intenta capturar de lejos (falla),
// se acerca y captura. Dura ~30 s.
import type {
  ClientToServerEvents,
  MatchDto,
  ServerToClientEvents,
} from '@manhunt/types';
import { io, type Socket } from 'socket.io-client';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const PLAZA = { lat: 41.387, lng: 2.17 };
const metersNorth = (m: number) => ({
  lat: PLAZA.lat + m / 111_000,
  lng: PLAZA.lng,
});

// --- Salida bonita ------------------------------------------------------------

const t0 = Date.now();
const colors = {
  hunter: '\x1b[31m',
  runner: '\x1b[32m',
  api: '\x1b[36m',
  step: '\x1b[1;33m',
};
function log(who: keyof typeof colors, msg: string, data?: unknown) {
  const time = ((Date.now() - t0) / 1000).toFixed(1).padStart(5);
  const extra = data === undefined ? '' : ` ${JSON.stringify(data)}`;
  console.log(`${time}s ${colors[who]}${who.padEnd(6)}\x1b[0m ${msg}${extra}`);
}
const step = (msg: string) => console.log(`\n${colors.step}▶ ${msg}\x1b[0m`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- HTTP ---------------------------------------------------------------------

async function http<T>(
  method: string,
  path: string,
  token?: string,
  body?: object,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token && { authorization: `Bearer ${token}` }),
    },
    body: body && JSON.stringify(body),
  });
  const json = res.status === 204 ? undefined : await res.json();
  if (!res.ok)
    throw new Error(
      `${method} ${path} -> ${res.status} ${JSON.stringify(json)}`,
    );
  return json as T;
}

async function newUser(prefix: string) {
  const username = `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
  const res = await http<{ accessToken: string; user: { id: string } }>(
    'POST',
    '/auth/register',
    undefined,
    { username, password: 'contraseña-segura' },
  );
  log('api', `registrado ${username}`);
  return { token: res.accessToken, id: res.user.id, username };
}

// --- WebSocket ----------------------------------------------------------------

async function connect(
  who: 'hunter' | 'runner',
  token: string,
): Promise<GameSocket> {
  const socket: GameSocket = io(`${API_URL}/game`, {
    auth: { token },
    transports: ['websocket'],
  });
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
  log(who, 'conectado al WebSocket');

  socket.on('match:updated', (m) =>
    log(who, `match:updated → ${m.status}`, playersSummary(m)),
  );
  socket.on('player:position', (p) =>
    log(who, 'player:position (compañero)', { lat: p.lat, lng: p.lng }),
  );
  socket.on('ping:reveal', (p) =>
    log(
      who,
      '📡 ping:reveal',
      p.runners.map((r) => ({ lat: r.lat, lng: r.lng })),
    ),
  );
  socket.on('ping:notice', () =>
    log(who, '📡 ping:notice: ¡te han localizado!'),
  );
  socket.on('player:caught', (p) =>
    log(who, '🫳 player:caught', { quedan: p.runnersRemaining }),
  );
  socket.on('match:finished', (p) =>
    log(who, `🏁 match:finished → ganan ${p.winnerTeam}`),
  );
  return socket;
}

const playersSummary = (m: MatchDto) =>
  m.players.map((p) => `${p.username}:${p.team}:${p.status}`).join(', ');

async function send(
  who: 'hunter' | 'runner',
  socket: GameSocket,
  event: keyof ClientToServerEvents,
  payload: object,
) {
  const ack = await (socket.timeout(5000) as any).emitWithAck(event, payload);
  log(
    who,
    `${event} → ${ack.ok ? 'ok' : `ERROR ${ack.error.code}: ${ack.error.message}`}`,
  );
  return ack;
}

function waitFor(
  socket: GameSocket,
  event: keyof ServerToClientEvents,
  predicate: (p: any) => boolean = () => true,
) {
  return new Promise<any>((resolve) => {
    const listener = (payload: any) => {
      if (!predicate(payload)) return;
      socket.off(event, listener);
      resolve(payload);
    };
    socket.on(event, listener);
  });
}

// --- Guion de la partida ------------------------------------------------------

async function main() {
  step(`API en ${API_URL}`);
  log('api', 'GET /health', await http('GET', '/health'));

  step('Dos jugadores nuevos');
  const hunter = await newUser('cazador');
  const runner = await newUser('escapador');

  step('El cazador crea la sala (5 s de escondite, ping cada 15 s)');
  const match = await http<MatchDto>('POST', '/matches', hunter.token, {
    playArea: { ...PLAZA, radiusMeters: 400 },
    hidingSeconds: 5,
    durationSeconds: 120,
    pingIntervalSeconds: 15,
  });
  log('api', `sala creada, código ${match.joinCode}`);

  const hs = await connect('hunter', hunter.token);
  const rs = await connect('runner', runner.token);
  await send('hunter', hs, 'match:subscribe', { matchId: match.id });

  step('El escapador se une con el código');
  await http('POST', '/matches/join', runner.token, {
    joinCode: match.joinCode,
  });
  await send('runner', rs, 'match:subscribe', { matchId: match.id });

  step('Empieza la partida: HIDING 5 s y luego ACTIVE');
  const active = waitFor(rs, 'match:updated', (m) => m.status === 'ACTIVE');
  await http('POST', `/matches/${match.id}/start`, hunter.token);
  await active;

  step('Cada uno envía su posición (el escapador a ~150 m)');
  await send('hunter', hs, 'location:update', { ...PLAZA, accuracy: 5 });
  await send('runner', rs, 'location:update', {
    ...metersNorth(150),
    accuracy: 8,
  });

  step('Intento de captura desde lejos (debe fallar con TOO_FAR)');
  await send('hunter', hs, 'catch:attempt', { runnerId: runner.id });

  step('Esperando el primer ping (~15 s desde que empezó la caza)…');
  await waitFor(hs, 'ping:reveal');

  step('El cazador se acerca a ~5 m y captura');
  await send('hunter', hs, 'location:update', metersNorth(145));
  await send('runner', rs, 'location:update', metersNorth(150));
  const finished = waitFor(rs, 'match:finished');
  await send('hunter', hs, 'catch:attempt', { runnerId: runner.id });
  await finished;

  await sleep(300);
  hs.disconnect();
  rs.disconnect();
  step('Fin de la simulación ✔');
}

main().catch((error: unknown) => {
  console.error('\n\x1b[31m✖ La simulación falló:\x1b[0m', error);
  process.exit(1);
});
