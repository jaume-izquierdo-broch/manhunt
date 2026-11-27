import {
  MATCH_LIMITS,
  type MatchSettings,
  matchSettingsSchema,
} from '@manhunt/types';
import {
  fitSettings,
  SETTING_STEPS,
  type SettingKey,
  stepsFor,
} from './match-settings';

const defaults: MatchSettings = matchSettingsSchema.parse({});
const keys = Object.keys(SETTING_STEPS) as SettingKey[];

describe('SETTING_STEPS', () => {
  it.each(keys)('%s stays within the server limits, in order', (key) => {
    const steps = SETTING_STEPS[key];
    expect(steps[0]).toBeGreaterThanOrEqual(MATCH_LIMITS[key].min);
    expect(steps.at(-1)).toBeLessThanOrEqual(MATCH_LIMITS[key].max);
    expect([...steps].sort((a, b) => a - b)).toEqual(steps);
  });

  it.each(keys)('%s includes the default', (key) => {
    expect(SETTING_STEPS[key]).toContain(MATCH_LIMITS[key].default);
  });

  it('goes from a park to a town', () => {
    expect(SETTING_STEPS.radiusMeters.at(0)).toBe(200);
    expect(SETTING_STEPS.radiusMeters.at(-1)).toBe(10_000);
    expect(SETTING_STEPS.hidingSeconds.at(-1)).toBe(3600);
    expect(SETTING_STEPS.durationSeconds.at(-1)).toBe(3 * 3600);
  });
});

describe('stepsFor', () => {
  it('only offers pings that fire at least three times in the hunt', () => {
    const tenMinutes = { ...defaults, durationSeconds: 600 };
    expect(stepsFor('pingIntervalSeconds', tenMinutes).at(-1)).toBe(240);
    expect(stepsFor('pingIntervalSeconds', defaults).at(-1)).toBe(900);
  });
});

describe('fitSettings', () => {
  it('keeps rules that already fit', () => {
    expect(fitSettings(defaults)).toBe(defaults);
  });

  it('shortens the pings when the hunt gets too short for them', () => {
    const settings = {
      ...defaults,
      durationSeconds: 1200,
      pingIntervalSeconds: 600,
    };
    const fitted = fitSettings(settings);
    expect(fitted.pingIntervalSeconds).toBe(540);
    expect(matchSettingsSchema.safeParse(fitted).success).toBe(true);
  });

  it('always gives rules the server accepts', () => {
    for (const durationSeconds of SETTING_STEPS.durationSeconds) {
      for (const pingIntervalSeconds of SETTING_STEPS.pingIntervalSeconds) {
        const fitted = fitSettings({
          ...defaults,
          durationSeconds,
          pingIntervalSeconds,
        });
        expect(matchSettingsSchema.safeParse(fitted).success).toBe(true);
      }
    }
  });
});
