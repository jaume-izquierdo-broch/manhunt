// Estado de la partida en el cliente. Reducer PURO: cada evento del socket es
// una acción, así toda la lógica de "qué cambia cuando pasa X" se testea sin red.
import {
  type MatchDto,
  type MatchFinishedPayload,
  type MatchSnapshot,
  MatchStatus,
  type PingNoticePayload,
  type PingRevealPayload,
  type PlayerCaughtPayload,
  type PlayerDto,
  PlayerStatus,
  type PositionDto,
  Team,
} from '@manhunt/types';
import { clockOffsetMs } from '../domain/time';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting';

export interface GameState {
  connection: ConnectionStatus;
  /** Último error de conexión/suscripción (para mostrarlo). */
  error: string | null;
  match: MatchDto | null;
  me: MatchSnapshot['me'] | null;
  /** Última posición de cada compañero, por userId. */
  teammates: Record<string, PositionDto>;
  /** Último ping (solo cazadores). */
  lastPing: PingRevealPayload | null;
  /** Último "te han localizado" (solo escapadores). */
  lastNoticeAt: string | null;
  lastCatch: PlayerCaughtPayload | null;
  /** La sala se cerró o te expulsaron. */
  closed: boolean;
  /** Reloj del servidor - reloj local (ms). */
  clockOffsetMs: number;
}

export type GameAction =
  | { type: 'connecting' }
  | { type: 'connected' }
  | { type: 'disconnected' }
  | { type: 'failed'; message: string }
  | { type: 'snapshot'; snapshot: MatchSnapshot; receivedAt: number }
  | { type: 'matchUpdated'; match: MatchDto }
  | { type: 'position'; position: PositionDto }
  | { type: 'pingReveal'; ping: PingRevealPayload }
  | { type: 'pingNotice'; notice: PingNoticePayload }
  | { type: 'playerCaught'; caught: PlayerCaughtPayload }
  | { type: 'matchFinished'; finished: MatchFinishedPayload }
  | { type: 'matchClosed' };

export const initialGameState: GameState = {
  connection: 'connecting',
  error: null,
  match: null,
  me: null,
  teammates: {},
  lastPing: null,
  lastNoticeAt: null,
  lastCatch: null,
  closed: false,
  clockOffsetMs: 0,
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'connecting':
      return { ...state, connection: 'connecting' };

    case 'connected':
      return { ...state, connection: 'connected', error: null };

    case 'disconnected':
      return { ...state, connection: 'reconnecting' };

    case 'failed':
      return { ...state, error: action.message };

    case 'snapshot': {
      const { snapshot } = action;
      return {
        ...state,
        error: null,
        match: snapshot.match,
        me: snapshot.me,
        teammates: Object.fromEntries(
          snapshot.teammates.map((p) => [p.userId, p]),
        ),
        lastPing: snapshot.lastPing,
        clockOffsetMs: clockOffsetMs(snapshot.serverTime, action.receivedAt),
      };
    }

    case 'matchUpdated':
      if (state.match && action.match.id !== state.match.id) return state;
      return withMatch(state, action.match);

    case 'position':
      if (action.position.userId === state.me?.userId) return state;
      return {
        ...state,
        teammates: {
          ...state.teammates,
          [action.position.userId]: action.position,
        },
      };

    case 'pingReveal':
      return { ...state, lastPing: action.ping };

    case 'pingNotice':
      return { ...state, lastNoticeAt: action.notice.at };

    case 'playerCaught': {
      const { caught } = action;
      const { [caught.runnerId]: _removed, ...teammates } = state.teammates;
      const next = state.match
        ? withMatch(state, {
            ...state.match,
            players: state.match.players.map((p) =>
              p.userId === caught.runnerId
                ? {
                    ...p,
                    status: PlayerStatus.CAUGHT,
                    caughtBy: caught.hunterId,
                    caughtAt: caught.at,
                  }
                : p,
            ),
          })
        : state;
      return { ...next, teammates, lastCatch: caught };
    }

    case 'matchFinished':
      if (!state.match) return state;
      return withMatch(state, {
        ...state.match,
        status: MatchStatus.FINISHED,
        winnerTeam: action.finished.winnerTeam,
        endedAt: action.finished.endedAt,
      });

    case 'matchClosed':
      return { ...state, closed: true };
  }
}

/** Aplica una versión nueva de la partida y recalcula mi equipo/estado a partir de ella. */
function withMatch(state: GameState, match: MatchDto): GameState {
  if (!state.me) return { ...state, match };
  const mine = match.players.find((p) => p.userId === state.me?.userId);
  if (!mine) return { ...state, match, closed: true }; // ya no estoy en la partida
  const teamChanged = mine.team !== state.me.team;
  return {
    ...state,
    match,
    me: { userId: mine.userId, team: mine.team, status: mine.status },
    teammates: teamChanged ? {} : state.teammates,
  };
}

// ---------------------------------------------------------------------------
// Selectores
// ---------------------------------------------------------------------------

export const isLive = (status: MatchStatus | undefined) =>
  status === MatchStatus.HIDING || status === MatchStatus.ACTIVE;

export function playersOfTeam(match: MatchDto, team: Team): PlayerDto[] {
  return match.players.filter((p) => p.team === team);
}

export function aliveRunners(match: MatchDto): PlayerDto[] {
  return match.players.filter(
    (p) => p.team === Team.RUNNER && p.status === PlayerStatus.ALIVE,
  );
}

export function playerName(match: MatchDto | null, userId: string): string {
  return match?.players.find((p) => p.userId === userId)?.username ?? 'Alguien';
}

export function hasBalancedTeams(match: MatchDto): boolean {
  return (
    playersOfTeam(match, Team.HUNTER).length > 0 &&
    playersOfTeam(match, Team.RUNNER).length > 0
  );
}
