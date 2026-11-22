import { Injectable } from '@nestjs/common';
import type { ServerToClientEvents, Team } from '@manhunt/types';
import type { GameNamespace } from './realtime.types.js';
import { Rooms } from './rooms.js';

type EventArgs<E extends keyof ServerToClientEvents> = Parameters<
  ServerToClientEvents[E]
>;

/**
 * Único punto para ENVIAR eventos a los clientes desde cualquier servicio
 * (controladores REST, temporizadores...). Los servicios no tocan Socket.IO.
 *
 * El gateway le entrega el namespace al arrancar (`attach`). Con el adaptador
 * de Redis, las emisiones llegan también a sockets conectados a otras réplicas.
 */
@Injectable()
export class RealtimePublisher {
  private ns?: GameNamespace;

  attach(ns: GameNamespace) {
    this.ns = ns;
  }

  // --- Emisiones -----------------------------------------------------------

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

  /** A los compañeros de equipo, sin devolvérselo al propio usuario. */
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

  // --- Gestión de salas ----------------------------------------------------

  /** Mete los sockets de un usuario en la sala de su equipo (al empezar la partida). */
  joinTeam(matchId: string, userId: string, team: Team) {
    this.ns?.in(Rooms.user(userId)).socketsJoin(Rooms.team(matchId, team));
  }

  /** Saca los sockets de un usuario de todas las salas de una partida. */
  removeFromMatch(matchId: string, userId: string) {
    this.ns?.in(Rooms.user(userId)).socketsLeave(Rooms.allOfMatch(matchId));
  }
}
