import type { Team } from '@manhunt/types';

/**
 * Salas de Socket.IO:
 * - `user:<id>`            todos los sockets de un usuario (puede tener varios dispositivos)
 * - `match:<id>`           todos los suscritos a una partida
 * - `match:<id>:<TEAM>`    un equipo de una partida (solo desde que empieza)
 */
export const Rooms = {
  user: (userId: string) => `user:${userId}`,
  match: (matchId: string) => `match:${matchId}`,
  team: (matchId: string, team: Team) => `match:${matchId}:${team}`,
  allOfMatch: (matchId: string) => [
    Rooms.match(matchId),
    Rooms.team(matchId, 'HUNTER'),
    Rooms.team(matchId, 'RUNNER'),
  ],
};
