import { formatDistance, formatDuration } from './format';

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
  it('metros por debajo de 1 km y kilómetros con coma por encima', () => {
    expect(formatDistance(12.4)).toBe('12 m');
    expect(formatDistance(1500)).toBe('1,5 km');
  });
});
