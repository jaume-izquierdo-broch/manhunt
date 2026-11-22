// Reglas puras de la sala (sin BD ni red), testeadas en lobby-rules.spec.ts.
import {
  JOIN_CODE_ALPHABET,
  JOIN_CODE_LENGTH,
  MatchStatus,
  Team,
} from '@manhunt/types';
import { randomInt } from 'node:crypto';
import type { MatchRow } from '../../../infrastructure/database/schema.js';
import { MatchErrors } from '../matches.errors.js';

/** Código de 6 caracteres sin 0/O ni 1/I (fácil de dictar). */
export function generateJoinCode(): string {
  let code = '';
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    code += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)];
  }
  return code;
}

/** Para empezar hace falta al menos un cazador y un escapador. */
export function hasBalancedTeams(players: { team: Team }[]): boolean {
  return (
    players.some((p) => p.team === Team.HUNTER) &&
    players.some((p) => p.team === Team.RUNNER)
  );
}

/** Lanza si el usuario no es el anfitrión o si la partida ya no está en la sala. */
export function assertHostInLobby(match: MatchRow, userId: string): void {
  if (match.hostId !== userId) throw MatchErrors.notHost();
  assertInLobby(match);
}

export function assertInLobby(
  match: MatchRow,
  message = 'La partida ya ha empezado',
): void {
  if (match.status !== MatchStatus.WAITING)
    throw MatchErrors.invalidStatus(message);
}
