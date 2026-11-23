// Pure lobby rules: no database or network access.
import {
  JOIN_CODE_ALPHABET,
  JOIN_CODE_LENGTH,
  MatchStatus,
  Team,
} from '@manhunt/types';
import { randomInt } from 'node:crypto';
import type { MatchRow } from '../../../infrastructure/database/schema.js';
import { MatchErrors } from '../matches.errors.js';

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
  if (match.hostId !== userId) throw MatchErrors.notHost();
  assertInLobby(match);
}

export function assertInLobby(
  match: MatchRow,
  message = 'The match has already started',
): void {
  if (match.status !== MatchStatus.WAITING) {
    throw MatchErrors.invalidStatus(message);
  }
}
