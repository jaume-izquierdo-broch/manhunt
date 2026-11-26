import type { LobbyLocationDto, MatchDto, PositionDto } from '@manhunt/types';
import { distanceMeters } from '../../common/geo/geo.js';
import type { MatchRow } from '../../infrastructure/database/schema.js';
import type { PlayerView } from './matches.repository.js';

const iso = (date: Date | null) => (date ? date.toISOString() : null);

/**
 * Database rows -> the public DTO sent to clients. `lobbyPositions` are the
 * players' latest positions, only passed while the match is in the lobby.
 */
export function toMatchDto(
  match: MatchRow,
  players: PlayerView[],
  lobbyPositions: PositionDto[] = [],
): MatchDto {
  const positionOf = (userId: string) =>
    lobbyPositions.find((p) => p.userId === userId) ?? null;
  const hostPosition = positionOf(match.hostId);

  const lobbyLocationOf = (userId: string): LobbyLocationDto | null => {
    const position = positionOf(userId);
    if (!position) return null;
    return {
      distanceFromHostMeters:
        hostPosition && userId !== match.hostId
          ? Math.round(distanceMeters(position, hostPosition))
          : null,
      accuracy: position.accuracy,
      at: position.at,
    };
  };

  return {
    id: match.id,
    joinCode: match.joinCode,
    hostId: match.hostId,
    status: match.status,
    radiusMeters: match.radiusMeters,
    playArea:
      match.centerLat !== null && match.centerLng !== null
        ? {
            lat: match.centerLat,
            lng: match.centerLng,
            radiusMeters: match.radiusMeters,
          }
        : null,
    hidingSeconds: match.hidingSeconds,
    durationSeconds: match.durationSeconds,
    pingIntervalSeconds: match.pingIntervalSeconds,
    winnerTeam: match.winnerTeam ?? null,
    createdAt: match.createdAt.toISOString(),
    startedAt: iso(match.startedAt),
    hidingEndsAt: iso(match.hidingEndsAt),
    endsAt: iso(match.endsAt),
    endedAt: iso(match.endedAt),
    players: players.map((p) => ({
      userId: p.userId,
      username: p.username,
      team: p.team,
      status: p.status,
      caughtBy: p.caughtBy,
      caughtAt: iso(p.caughtAt),
      lobbyLocation: lobbyLocationOf(p.userId),
    })),
  };
}
