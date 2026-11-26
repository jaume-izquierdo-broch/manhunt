import { type PositionDto, Team } from '@manhunt/types';
import {
  describePlayersNotReady,
  findPlayersNotReady,
  hasBalancedTeams,
  isHostAccurateEnough,
} from './start-rules.js';

const center = { lat: 41.387, lng: 2.17 };
const now = new Date('2026-01-01T12:00:00Z');
const metersNorth = (m: number) => ({
  lat: center.lat + m / 111_320,
  lng: center.lng,
});

const at = (
  point: { lat: number; lng: number },
  secondsAgo = 0,
  accuracy: number | null = 5,
): PositionDto => ({
  userId: 'x',
  ...point,
  accuracy,
  at: new Date(now.getTime() - secondsAgo * 1000).toISOString(),
});

const check = (position: PositionDto | null) =>
  findPlayersNotReady(
    [{ userId: 'ana', username: 'ana', position }],
    center,
    300,
    now,
  );

describe('findPlayersNotReady', () => {
  it('accepts a player inside the area', () => {
    expect(check(at(metersNorth(250)))).toEqual([]);
  });

  it('forgives part of the GPS error at the edge', () => {
    expect(check(at(metersNorth(330), 0, 40))).toEqual([]);
    expect(check(at(metersNorth(400), 0, 500))).toHaveLength(1);
  });

  it('rejects a player outside the area', () => {
    const [ana] = check(at(metersNorth(1000)));
    expect(ana).toMatchObject({ username: 'ana', reason: 'far' });
    expect(ana?.distanceMeters).toBeCloseTo(1000, -1);
  });

  it('rejects a player without a location, or with an old one', () => {
    expect(check(null)[0]?.reason).toBe('noLocation');
    expect(check(at(center, 60))[0]?.reason).toBe('noLocation');
  });
});

describe('isHostAccurateEnough', () => {
  it('requires 100 m or better', () => {
    expect(isHostAccurateEnough(undefined)).toBe(true);
    expect(isHostAccurateEnough(100)).toBe(true);
    expect(isHostAccurateEnough(101)).toBe(false);
  });
});

describe('describePlayersNotReady', () => {
  it('names every player and the reason', () => {
    expect(
      describePlayersNotReady([
        { username: 'ana', reason: 'noLocation', distanceMeters: null },
        { username: 'marc', reason: 'far', distanceMeters: 1200 },
      ]),
    ).toBe('ana has no location; marc is 1200 m away');
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
