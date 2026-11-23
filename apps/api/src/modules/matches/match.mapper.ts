import type { MatchDto } from '@manhunt/types';
import type { MatchRow } from '../../infrastructure/database/schema.js';
import type { PlayerView } from './matches.repository.js';

const iso = (date: Date | null) => (date ? date.toISOString() : null);

/** Database rows -> the public DTO sent to clients. */
export function toMatchDto(match: MatchRow, players: PlayerView[]): MatchDto {
  return {
    id: match.id,
    joinCode: match.joinCode,
    hostId: match.hostId,
    status: match.status,
    playArea: {
      lat: match.centerLat,
      lng: match.centerLng,
      radiusMeters: match.radiusMeters,
    },
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
    })),
  };
}
