import { countOf, formatDistance, formatDuration } from './format';

describe('formatDuration', () => {
  it.each([
    [0, '0 s'],
    [45, '45 s'],
    [90, '1 min 30 s'],
    [1800, '30 min'],
    [3600, '1 h'],
    [5400, '1 h 30 min'],
  ])('%i s -> %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe('formatDistance', () => {
  it('uses meters below 1 km and kilometers above', () => {
    expect(formatDistance(12.4)).toBe('12 m');
    expect(formatDistance(1500)).toBe('1.5 km');
  });
});

describe('countOf', () => {
  it('uses the singular only for one', () => {
    expect(countOf(1, 'player')).toBe('1 player');
    expect(countOf(0, 'player')).toBe('0 players');
    expect(countOf(3, 'player')).toBe('3 players');
  });
});
