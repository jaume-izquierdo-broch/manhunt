import type { MatchDto, PlayerDto } from '@manhunt/types';
import { makeMatch, player } from '@/test-utils/fixtures';
import { aliveRunners, hasBalancedTeams, isLive, playerName } from './players';

const match: MatchDto = makeMatch({
  players: [
    player('hunter', 'HUNTER'),
    player('runner1', 'RUNNER'),
    player('runner2', 'RUNNER', { status: 'CAUGHT' } as Partial<PlayerDto>),
  ],
});

describe('player rules', () => {
  it('aliveRunners leaves out caught runners', () => {
    expect(aliveRunners(match).map((p) => p.userId)).toEqual(['runner1']);
  });

  it('hasBalancedTeams needs a hunter and a runner', () => {
    expect(hasBalancedTeams(match)).toBe(true);
    expect(hasBalancedTeams(makeMatch())).toBe(false);
  });

  it('playerName falls back to "Someone"', () => {
    expect(playerName(match, 'runner1')).toBe('runner1');
    expect(playerName(match, 'nobody')).toBe('Someone');
  });

  it('isLive: only while hiding or hunting', () => {
    expect(isLive('HIDING')).toBe(true);
    expect(isLive('ACTIVE')).toBe(true);
    expect(isLive('WAITING')).toBe(false);
    expect(isLive(undefined)).toBe(false);
  });
});
