// Plays a full match against a running API and narrates what happens.
//
//   pnpm --filter @manhunt/api simulate
//   API_URL=http://localhost:3100 pnpm --filter @manhunt/api simulate
//
// Registers a hunter and a runner, sets up the lobby, starts the match, moves
// the runner, waits for a ping, tries a catch from too far away (fails), moves
// closer and catches. Takes about 20 seconds.
import type {
  Ack,
  ClientToServerEvents,
  MatchDto,
  ServerToClientEvents,
} from '@manhunt/types';
import { io, type Socket } from 'socket.io-client';

type RealtimeSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type Actor = 'hunter' | 'runner' | 'api';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const ORIGIN = { lat: 41.387, lng: 2.17 };
const metersNorth = (meters: number) => ({
  lat: ORIGIN.lat + meters / 111_000,
  lng: ORIGIN.lng,
});

// --- Console output -----------------------------------------------------------

const startedAt = Date.now();
const COLORS: Record<Actor | 'step', string> = {
  hunter: '\x1b[31m',
  runner: '\x1b[32m',
  api: '\x1b[36m',
  step: '\x1b[1;33m',
};
const RESET = '\x1b[0m';

function log(actor: Actor, message: string, data?: unknown) {
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1).padStart(5);
  const extra = data === undefined ? '' : ` ${JSON.stringify(data)}`;
  console.log(
    `${elapsed}s ${COLORS[actor]}${actor.padEnd(6)}${RESET} ${message}${extra}`,
  );
}

const step = (message: string) =>
  console.log(`\n${COLORS.step}▶ ${message}${RESET}`);

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
  if (!res.ok) {
    throw new Error(
      `${method} ${path} -> ${res.status} ${JSON.stringify(json)}`,
    );
  }
  return json as T;
}

async function registerUser(prefix: string) {
  const username = `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
  const res = await http<{ accessToken: string; user: { id: string } }>(
    'POST',
    '/auth/register',
    undefined,
    {
      username,
      email: `${username}@simulation.manhunt`,
      password: 'correct-horse-battery',
      acceptTerms: true,
    },
  );
  log('api', `registered ${username}`);
  return { token: res.accessToken, id: res.user.id };
}

// --- WebSocket ----------------------------------------------------------------

async function connect(actor: Actor, token: string): Promise<RealtimeSocket> {
  const socket: RealtimeSocket = io(`${API_URL}/realtime`, {
    auth: { token },
    transports: ['websocket'],
  });
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
  log(actor, 'connected to the WebSocket');

  socket.on('match:updated', (m) =>
    log(actor, `match:updated → ${m.status}`, summarizePlayers(m)),
  );
  socket.on('player:position', (p) =>
    log(actor, 'player:position (teammate)', { lat: p.lat, lng: p.lng }),
  );
  socket.on('ping:reveal', (p) =>
    log(
      actor,
      '📡 ping:reveal',
      p.runners.map((r) => ({ lat: r.lat, lng: r.lng })),
    ),
  );
  socket.on('ping:notice', () =>
    log(actor, '📡 ping:notice: the hunters saw you!'),
  );
  socket.on('player:caught', (p) =>
    log(actor, '🫳 player:caught', { runnersLeft: p.runnersRemaining }),
  );
  socket.on('match:finished', (p) =>
    log(actor, `🏁 match:finished → ${p.winnerTeam} team wins`),
  );
  return socket;
}

const summarizePlayers = (m: MatchDto) =>
  m.players.map((p) => `${p.username}:${p.team}:${p.status}`).join(', ');

async function send(
  actor: Actor,
  socket: RealtimeSocket,
  event: keyof ClientToServerEvents,
  payload: object,
) {
  // socket.io's generics don't cover emitWithAck with a variable event name.
  const ack: Ack<unknown> = await (socket.timeout(5000) as any).emitWithAck(
    event,
    payload,
  );
  log(
    actor,
    `${event} → ${ack.ok ? 'ok' : `ERROR ${ack.error.code}: ${ack.error.message}`}`,
  );
}

function waitFor<E extends keyof ServerToClientEvents>(
  socket: RealtimeSocket,
  event: E,
  predicate: (
    payload: Parameters<ServerToClientEvents[E]>[0],
  ) => boolean = () => true,
): Promise<void> {
  return new Promise((resolve) => {
    const listener = (payload: Parameters<ServerToClientEvents[E]>[0]) => {
      if (!predicate(payload)) return;
      socket.off(event, listener as never);
      resolve();
    };
    socket.on(event, listener as never);
  });
}

// --- The match ----------------------------------------------------------------

async function main() {
  step(`API at ${API_URL}`);
  log('api', 'GET /health', await http('GET', '/health'));

  step('Two new players');
  const hunter = await registerUser('hunter');
  const runner = await registerUser('runner');

  step('The hunter creates the lobby (5 s to hide, a ping every 15 s)');
  const match = await http<MatchDto>('POST', '/lobbies', hunter.token, {
    radiusMeters: 400,
    hidingSeconds: 5,
    durationSeconds: 120,
    pingIntervalSeconds: 15,
  });
  log('api', `lobby created with code ${match.joinCode}`);

  const hunterSocket = await connect('hunter', hunter.token);
  const runnerSocket = await connect('runner', runner.token);
  await send('hunter', hunterSocket, 'match:subscribe', { matchId: match.id });

  step('The runner joins with the code');
  await http('POST', '/lobbies/join', runner.token, {
    joinCode: match.joinCode,
  });
  await send('runner', runnerSocket, 'match:subscribe', { matchId: match.id });

  step('The runner shares their location from the lobby');
  await send('runner', runnerSocket, 'location:update', ORIGIN);

  step('The match starts around the hunter: 5 s of HIDING, then ACTIVE');
  const active = waitFor(
    runnerSocket,
    'match:updated',
    (m) => m.status === 'ACTIVE',
  );
  await http('POST', `/matches/${match.id}/start`, hunter.token, ORIGIN);
  await active;

  step('Both report their positions (the runner is ~150 m away)');
  await send('hunter', hunterSocket, 'location:update', {
    ...ORIGIN,
    accuracy: 5,
  });
  await send('runner', runnerSocket, 'location:update', {
    ...metersNorth(150),
    accuracy: 8,
  });

  step('A catch from too far away (should fail with TOO_FAR)');
  await send('hunter', hunterSocket, 'catch:attempt', { runnerId: runner.id });

  step('Waiting for the first ping (~15 s after the hunt starts)…');
  await waitFor(hunterSocket, 'ping:reveal');

  step('The hunter moves within ~5 m and catches the runner');
  await send('hunter', hunterSocket, 'location:update', metersNorth(145));
  await send('runner', runnerSocket, 'location:update', metersNorth(150));
  const finished = waitFor(runnerSocket, 'match:finished');
  await send('hunter', hunterSocket, 'catch:attempt', { runnerId: runner.id });
  await finished;

  await new Promise((r) => setTimeout(r, 300));
  hunterSocket.disconnect();
  runnerSocket.disconnect();
  step('Simulation finished ✔');
}

main().catch((error: unknown) => {
  console.error(`\n\x1b[31m✖ The simulation failed:${RESET}`, error);
  process.exit(1);
});
