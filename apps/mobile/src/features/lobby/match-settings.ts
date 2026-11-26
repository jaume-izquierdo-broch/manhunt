import {
  MATCH_LIMITS,
  type MatchSettings,
  pingsDuringHunt,
} from '@manhunt/types';
import { countOf, formatDistance, formatDuration } from '@/lib/format';

export type SettingKey = keyof MatchSettings;

/** Paces on foot, to say what each value means on the street. */
const WALK_METERS_PER_MINUTE = 80; // about 5 km/h
const JOG_METERS_PER_MINUTE = 150; // about 9 km/h

const minutes = (m: number) => m * 60;

function range(from: number, to: number, step: number): number[] {
  const values: number[] = [];
  for (let v = from; v <= to; v += step) values.push(v);
  return values;
}

/**
 * The values the host can pick, from a park to a whole town. Steps grow with
 * the value: 50 m matter in a small area, not in a 5 km one.
 */
export const SETTING_STEPS: Record<SettingKey, readonly number[]> = {
  radiusMeters: [
    ...range(200, 1000, 50),
    ...range(1100, 3000, 100),
    ...range(3500, 10_000, 500),
  ],
  hidingSeconds: [
    ...range(1, 10, 1),
    ...range(12, 20, 2),
    ...range(25, 60, 5),
  ].map(minutes),
  durationSeconds: [
    ...range(10, 60, 5),
    ...range(70, 120, 10),
    ...range(135, 180, 15),
  ].map(minutes),
  pingIntervalSeconds: [
    30,
    ...range(60, 180, 30),
    ...range(240, 600, 60),
    720,
    900,
  ],
};

const hasEnoughPings = (durationSeconds: number, pingIntervalSeconds: number) =>
  pingsDuringHunt(durationSeconds, pingIntervalSeconds) >=
  MATCH_LIMITS.minPings;

/** What the host can pick for a setting, given the others: pings must fit the hunt. */
export function stepsFor(
  key: SettingKey,
  settings: MatchSettings,
): readonly number[] {
  const steps = SETTING_STEPS[key];
  return key === 'pingIntervalSeconds'
    ? steps.filter((ping) => hasEnoughPings(settings.durationSeconds, ping))
    : steps;
}

/** Shortens the pings if a shorter hunt no longer fits them. */
export function fitSettings(settings: MatchSettings): MatchSettings {
  if (hasEnoughPings(settings.durationSeconds, settings.pingIntervalSeconds)) {
    return settings;
  }
  const pings = stepsFor('pingIntervalSeconds', settings);
  return {
    ...settings,
    pingIntervalSeconds: pings.at(-1) ?? MATCH_LIMITS.pingIntervalSeconds.min,
  };
}

const roundTo = (value: number, step: number) =>
  Math.max(step, Math.round(value / step) * step);

const jogged = (seconds: number) =>
  formatDistance(roundTo((seconds / 60) * JOG_METERS_PER_MINUTE, 50));

/** What a value means in practice, so the host can tell if the rules fit together. */
export function describeSetting(key: SettingKey, s: MatchSettings): string {
  const pings = countOf(
    pingsDuringHunt(s.durationSeconds, s.pingIntervalSeconds),
    'ping',
  );
  switch (key) {
    case 'radiusMeters': {
      const crossing = (s.radiusMeters * 2) / WALK_METERS_PER_MINUTE;
      return `About ${formatDuration(minutes(roundTo(crossing, crossing > 60 ? 5 : 1)))} to walk across.`;
    }
    case 'hidingSeconds':
      return `Jogging, runners get about ${jogged(s.hidingSeconds)} away. The edge is ${formatDistance(s.radiusMeters)} from the start.`;
    case 'durationSeconds':
      return `${pings}, one every ${formatDuration(s.pingIntervalSeconds)}.`;
    case 'pingIntervalSeconds':
      return `${pings} during the hunt. In between, a runner can jog about ${jogged(s.pingIntervalSeconds)}.`;
  }
}
