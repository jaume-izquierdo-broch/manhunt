import {
  ErrorCode,
  JOIN_CODE_ALPHABET,
  JOIN_CODE_LENGTH,
  Team,
} from '@manhunt/types';
import type { MatchRow } from '../../../infrastructure/database/schema.js';
import {
  assertHostInLobby,
  generateJoinCode,
  hasBalancedTeams,
} from './lobby-rules.js';

describe('generateJoinCode', () => {
  it('genera códigos con la longitud y el alfabeto correctos', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateJoinCode();
      expect(code).toHaveLength(JOIN_CODE_LENGTH);
      for (const ch of code) expect(JOIN_CODE_ALPHABET).toContain(ch);
    }
  });
});

describe('hasBalancedTeams', () => {
  it('requiere al menos un cazador y un escapador', () => {
    expect(hasBalancedTeams([{ team: Team.HUNTER }])).toBe(false);
    expect(
      hasBalancedTeams([{ team: Team.RUNNER }, { team: Team.RUNNER }]),
    ).toBe(false);
    expect(
      hasBalancedTeams([{ team: Team.HUNTER }, { team: Team.RUNNER }]),
    ).toBe(true);
  });
});

describe('assertHostInLobby', () => {
  const match = { hostId: 'host', status: 'WAITING' } as MatchRow;

  it('deja pasar al anfitrión en la sala', () => {
    expect(() => assertHostInLobby(match, 'host')).not.toThrow();
  });

  it('rechaza a quien no es anfitrión', () => {
    expect(() => assertHostInLobby(match, 'otro')).toThrow(
      expect.objectContaining({ code: ErrorCode.NOT_HOST }),
    );
  });

  it('rechaza si la partida ya empezó', () => {
    expect(() =>
      assertHostInLobby({ ...match, status: 'ACTIVE' }, 'host'),
    ).toThrow(
      expect.objectContaining({ code: ErrorCode.INVALID_MATCH_STATUS }),
    );
  });
});
