import type { Team } from '@manhunt/types';

/**
 * Socket.IO rooms:
 * - `user:<id>`          every socket of a user (they may use several devices)
 * - `session:<id>`       every socket opened with one session (closed on logout)
 * - `match:<id>`         everyone subscribed to a match
 * - `match:<id>:<TEAM>`  one team of a match (joined once the match starts)
 */
export const Rooms = {
  user: (userId: string) => `user:${userId}`,
  session: (sessionId: string) => `session:${sessionId}`,
  match: (matchId: string) => `match:${matchId}`,
  team: (matchId: string, team: Team) => `match:${matchId}:${team}`,
  allOfMatch: (matchId: string) => [
    Rooms.match(matchId),
    Rooms.team(matchId, 'HUNTER'),
    Rooms.team(matchId, 'RUNNER'),
  ],
};
