import { MATCH_LIMITS } from '@manhunt/types';
import type { Option } from '@/ui';

// Choices offered by the "Create match" form. All within the server's limits.

const minutes = (m: number) => m * 60;

export const RADIUS_OPTIONS: readonly Option<number>[] = [
  { value: 200, label: '200 m' },
  { value: 400, label: '400 m' },
  { value: 800, label: '800 m' },
  { value: 1500, label: '1.5 km' },
];

export const HIDING_OPTIONS: readonly Option<number>[] = [
  { value: 30, label: '30 s' },
  { value: minutes(1), label: '1 min' },
  { value: minutes(2), label: '2 min' },
  { value: minutes(5), label: '5 min' },
];

export const DURATION_OPTIONS: readonly Option<number>[] = [
  { value: minutes(10), label: '10 min' },
  { value: minutes(20), label: '20 min' },
  { value: minutes(30), label: '30 min' },
  { value: minutes(60), label: '1 h' },
];

export const PING_OPTIONS: readonly Option<number>[] = [
  { value: 30, label: '30 s' },
  { value: minutes(1), label: '1 min' },
  { value: minutes(2), label: '2 min' },
  { value: minutes(5), label: '5 min' },
];

export interface MatchSettings {
  radiusMeters: number;
  hidingSeconds: number;
  durationSeconds: number;
  pingIntervalSeconds: number;
}

export const DEFAULT_MATCH_SETTINGS: MatchSettings = {
  radiusMeters: 400,
  hidingSeconds: MATCH_LIMITS.hidingSeconds.default,
  durationSeconds: MATCH_LIMITS.durationSeconds.default,
  pingIntervalSeconds: MATCH_LIMITS.pingIntervalSeconds.default,
};
