import {
  ErrorCode,
  JOIN_CODE_ALPHABET,
  JOIN_CODE_LENGTH,
  type PositionDto,
  Team,
} from '@manhunt/types';
import type { MatchRow } from '../../../infrastructure/database/schema.js';
import {
  assertHostInLobby,
  generateJoinCode,
  hasBalancedTeams,
  shouldPublishLobbyLocation,
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
  const match = { hostId: 'host', status: 'LOBBY' } as MatchRow;

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

describe('shouldPublishLobbyLocation', () => {
  const position = (secondsAfter: number, latOffset = 0): PositionDto => ({
    userId: 'ana',
    lat: 41.387 + latOffset,
    lng: 2.17,
    accuracy: 5,
    at: new Date(Date.UTC(2026, 0, 1, 12, 0, secondsAfter)).toISOString(),
  });

  it('publishes the first location', () => {
    expect(shouldPublishLobbyLocation(null, position(0))).toBe(true);
  });

  it('skips a small move shortly after the last one', () => {
    expect(shouldPublishLobbyLocation(position(0), position(10, 0.00005))).toBe(
      false,
    );
  });

  it('publishes a real move, or after a while so it never looks stale', () => {
    expect(shouldPublishLobbyLocation(position(0), position(10, 0.001))).toBe(
      true,
    );
    expect(shouldPublishLobbyLocation(position(0), position(25))).toBe(true);
  });
});
