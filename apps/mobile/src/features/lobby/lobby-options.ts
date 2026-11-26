import type { Option } from '@/ui';

// Choices the host gets in the lobby, all within the server's limits.
// The second option of each list is the default (MATCH_LIMITS), except the
// hunt, whose default is the third.

const minutes = (m: number) => m * 60;

export const RADIUS_OPTIONS: readonly Option<number>[] = [
  { value: 300, label: '300 m' },
  { value: 600, label: '600 m' },
  { value: 1000, label: '1 km' },
  { value: 2000, label: '2 km' },
];

export const HIDING_OPTIONS: readonly Option<number>[] = [
  { value: minutes(1), label: '1 min' },
  { value: minutes(3), label: '3 min' },
  { value: minutes(5), label: '5 min' },
  { value: minutes(8), label: '8 min' },
];

export const DURATION_OPTIONS: readonly Option<number>[] = [
  { value: minutes(20), label: '20 min' },
  { value: minutes(40), label: '40 min' },
  { value: minutes(60), label: '1 h' },
  { value: minutes(120), label: '2 h' },
];

export const PING_OPTIONS: readonly Option<number>[] = [
  { value: minutes(1), label: '1 min' },
  { value: minutes(2), label: '2 min' },
  { value: minutes(3), label: '3 min' },
  { value: minutes(5), label: '5 min' },
];
