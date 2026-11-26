// Pure lobby rules: no database or network access.
import {
  JOIN_CODE_ALPHABET,
  JOIN_CODE_LENGTH,
  LOBBY_LOCATION,
  MatchStatus,
  type PositionDto,
  Team,
} from '@manhunt/types';
import { randomInt } from 'node:crypto';
import { distanceMeters } from '../../../common/geo/geo.js';
import type { MatchRow } from '../../../infrastructure/database/schema.js';
import { MatchErrors } from '../../matches/matches.errors.js';
import { LobbyErrors } from '../lobby.errors.js';

/** A random join code from the unambiguous alphabet. */
export function generateJoinCode(): string {
  let code = '';
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    code += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)];
  }
  return code;
}

/** A match needs at least one hunter and one runner to start. */
export function hasBalancedTeams(players: { team: Team }[]): boolean {
  return (
    players.some((p) => p.team === Team.HUNTER) &&
    players.some((p) => p.team === Team.RUNNER)
  );
}

/** Throws unless the user is the host and the match is still in the lobby. */
export function assertHostInLobby(match: MatchRow, userId: string): void {
  if (match.hostId !== userId) throw LobbyErrors.notHost();
  assertInLobby(match);
}

export function assertInLobby(
  match: MatchRow,
  message = 'The match has already started',
): void {
  if (match.status !== MatchStatus.LOBBY) {
    throw MatchErrors.invalidStatus(message);
  }
}

const REFRESH_AFTER_MS = LOBBY_LOCATION.staleAfterMs / 2;
const MOVED_METERS = 20;

/**
 * Whether a new lobby location is worth broadcasting: the first one, a move
 * that may change who is in range, or often enough that it never looks stale.
 */
export function shouldPublishLobbyLocation(
  previous: PositionDto | null,
  next: PositionDto,
): boolean {
  if (!previous) return true;
  if (Date.parse(next.at) - Date.parse(previous.at) >= REFRESH_AFTER_MS) {
    return true;
  }
  return distanceMeters(previous, next) >= MOVED_METERS;
}
