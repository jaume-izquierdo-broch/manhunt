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
  it('generates codes with the right length and alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateJoinCode();
      expect(code).toHaveLength(JOIN_CODE_LENGTH);
      for (const ch of code) expect(JOIN_CODE_ALPHABET).toContain(ch);
    }
  });
});

describe('hasBalancedTeams', () => {
  it('requires at least one hunter and one runner', () => {
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

  it('lets the host through while in the lobby', () => {
    expect(() => assertHostInLobby(match, 'host')).not.toThrow();
  });

  it('rejects anyone who is not the host', () => {
    expect(() => assertHostInLobby(match, 'someone-else')).toThrow(
      expect.objectContaining({ code: ErrorCode.NOT_HOST }),
    );
  });

  it('rejects once the match has started', () => {
    expect(() =>
      assertHostInLobby({ ...match, status: 'ACTIVE' }, 'host'),
    ).toThrow(
      expect.objectContaining({ code: ErrorCode.INVALID_MATCH_STATUS }),
    );
  });
});
