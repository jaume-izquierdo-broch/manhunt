// Pure rules for starting a match: no database or network access.
import {
  LOBBY_LOCATION,
  lobbyReadiness,
  type PositionDto,
} from '@manhunt/types';
import { distanceMeters, type LatLng } from '../../../common/geo/geo.js';

export interface PlayerToCheck {
  userId: string;
  username: string;
  position: PositionDto | null;
}

export interface PlayerNotReady {
  username: string;
  reason: 'noLocation' | 'far';
  distanceMeters: number | null;
}

export function isHostAccurateEnough(accuracy: number | undefined): boolean {
  return (
    accuracy === undefined || accuracy <= LOBBY_LOCATION.maxHostAccuracyMeters
  );
}

/** Players without a recent location, or outside the area centered on the host. */
export function findPlayersNotReady(
  players: PlayerToCheck[],
  center: LatLng,
  radiusMeters: number,
  now: Date,
): PlayerNotReady[] {
  return players.flatMap((player) => {
    const distance = player.position
      ? Math.round(distanceMeters(player.position, center))
      : null;
    const readiness = lobbyReadiness(
      player.position && {
        distanceFromHostMeters: distance,
        accuracy: player.position.accuracy,
        at: player.position.at,
      },
      radiusMeters,
      now,
    );
    return readiness === 'ready'
      ? []
      : [
          {
            username: player.username,
            reason: readiness,
            distanceMeters: distance,
          },
        ];
  });
}

/** "ana has no location; marc is 1200 m away". */
export function describePlayersNotReady(players: PlayerNotReady[]): string {
  return players
    .map((p) =>
      p.reason === 'far'
        ? `${p.username} is ${p.distanceMeters} m away`
        : `${p.username} has no location`,
    )
    .join('; ');
}
