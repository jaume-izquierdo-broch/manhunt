import { Injectable } from '@nestjs/common';
import type { ServerToClientEvents, Team } from '@manhunt/types';
import type { GameNamespace } from './realtime.types.js';
import { Rooms } from './rooms.js';

type EventArgs<E extends keyof ServerToClientEvents> = Parameters<
  ServerToClientEvents[E]
>;

/**
 * The single place where services SEND events to clients (from REST handlers,
 * timers...), so they never touch Socket.IO directly.
 *
 * The gateway hands over its namespace at startup (`attach`). Thanks to the
 * Redis adapter, events also reach sockets connected to other replicas.
 */
@Injectable()
export class RealtimePublisher {
  private ns?: GameNamespace;

  attach(ns: GameNamespace) {
    this.ns = ns;
  }

  // --- Emitting ------------------------------------------------------------

  toMatch<E extends keyof ServerToClientEvents>(
    matchId: string,
    event: E,
    ...args: EventArgs<E>
  ) {
    this.ns?.to(Rooms.match(matchId)).emit(event, ...args);
  }

  toTeam<E extends keyof ServerToClientEvents>(
    matchId: string,
    team: Team,
    event: E,
    ...args: EventArgs<E>
  ) {
    this.ns?.to(Rooms.team(matchId, team)).emit(event, ...args);
  }

  /** To the user's teammates, excluding the user. */
  toTeammates<E extends keyof ServerToClientEvents>(
    matchId: string,
    team: Team,
    userId: string,
    event: E,
    ...args: EventArgs<E>
  ) {
    this.ns
      ?.to(Rooms.team(matchId, team))
      .except(Rooms.user(userId))
      .emit(event, ...args);
  }

  toUser<E extends keyof ServerToClientEvents>(
    userId: string,
    event: E,
    ...args: EventArgs<E>
  ) {
    this.ns?.to(Rooms.user(userId)).emit(event, ...args);
  }

  // --- Room membership -----------------------------------------------------

  /** Adds a user's sockets to their team room (when the match starts). */
  joinTeam(matchId: string, userId: string, team: Team) {
    this.ns?.in(Rooms.user(userId)).socketsJoin(Rooms.team(matchId, team));
  }

  /** Disconnects the sockets opened with these sessions (after a logout), on every replica. */
  disconnectSessions(sessionIds: string[]) {
    if (sessionIds.length === 0) return;
    this.ns?.in(sessionIds.map(Rooms.session)).disconnectSockets(true);
  }

  /** Removes a user's sockets from every room of a match. */
  removeFromMatch(matchId: string, userId: string) {
    this.ns?.in(Rooms.user(userId)).socketsLeave(Rooms.allOfMatch(matchId));
  }
}
