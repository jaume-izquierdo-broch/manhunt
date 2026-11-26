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
