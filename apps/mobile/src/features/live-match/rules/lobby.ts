// Who is ready to start, from the lobby locations the server sends. Pure functions.
import {
  type LobbyReadiness,
  lobbyReadiness,
  type MatchDto,
  type PlayerDto,
} from '@manhunt/types';

export function readinessOf(
  match: MatchDto,
  player: PlayerDto,
  now: number,
): LobbyReadiness {
  return lobbyReadiness(
    player.lobbyLocation,
    match.radiusMeters,
    new Date(now),
  );
}

export interface PlayerNotReady {
  player: PlayerDto;
  readiness: Exclude<LobbyReadiness, 'ready'>;
}

export function playersNotReady(
  match: MatchDto,
  now: number,
): PlayerNotReady[] {
  return match.players.flatMap((player) => {
    const readiness = readinessOf(match, player, now);
    return readiness === 'ready' ? [] : [{ player, readiness }];
  });
}

/** "Waiting for ana (no location) and marc (too far)". */
export function describeWaitingFor(notReady: PlayerNotReady[]): string {
  const names = notReady.map(
    ({ player, readiness }) =>
      `${player.username} (${readiness === 'far' ? 'too far' : 'no location'})`,
  );
  const list =
    names.length > 1
      ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
      : names[0];
  return `Waiting for ${list}`;
}
