import { makeMatch, player } from '@/test-utils/fixtures';
import { describeWaitingFor, playersNotReady } from './lobby';

const now = Date.parse('2026-01-01T12:00:00Z');
const located = (distance: number | null, secondsAgo = 0) => ({
  distanceFromHostMeters: distance,
  accuracy: 5,
  at: new Date(now - secondsAgo * 1000).toISOString(),
});

describe('lobby readiness', () => {
  const match = makeMatch({
    radiusMeters: 400,
    players: [
      player('host', 'HUNTER', { lobbyLocation: located(null) }),
      player('ana', 'RUNNER', { lobbyLocation: located(120) }),
      player('marc', 'RUNNER', { lobbyLocation: located(1500) }),
      player('lia', 'RUNNER'),
      player('joan', 'RUNNER', { lobbyLocation: located(50, 120) }),
    ],
  });

  it('finds who has no recent location or is outside the area', () => {
    expect(
      playersNotReady(match, now).map((p) => [p.player.username, p.readiness]),
    ).toEqual([
      ['marc', 'far'],
      ['lia', 'noLocation'],
      ['joan', 'noLocation'],
    ]);
  });

  it('says who the match is waiting for', () => {
    expect(describeWaitingFor(playersNotReady(match, now))).toBe(
      'Waiting for marc (too far), lia (no location) and joan (no location)',
    );
  });
});
