import type { DaySignals } from '../../weather/index.js';
import indoorSightseeing from '../classifiers/indoor-sightseeing/indoor-sightseeing.rules.json' with { type: 'json' };
import outdoorSightseeing from '../classifiers/outdoor-sightseeing/outdoor-sightseeing.rules.json' with { type: 'json' };
import skiing from '../classifiers/skiing/skiing.rules.json' with { type: 'json' };
import surfing from '../classifiers/surfing/surfing.rules.json' with { type: 'json' };

// The DaySignals keys a rule may name; anything else fails the rule-set schema at construction.
export const SCORABLE_SIGNALS = [
  'tempMax',
  'tempMin',
  'precipitation',
  'precipitationProbability',
  'snowfall',
  'snowDepth',
  'windMax',
  'windGusts',
  'cloudCover',
  'uvIndex',
  'sunshineHours',
  'visibility',
  'waveHeight',
  'wavePeriod',
  'swellHeight',
] as const satisfies readonly (keyof DaySignals)[];

// Prefix of RuleSetProvider.version; bumps when the rule-file schema changes.
export const RULE_SET_SCHEMA_VERSION = 'v1';

// One file per activity, next to its classifier; a new activity adds its line here.
export const RULE_FILES: Readonly<Record<string, unknown>> = {
  SKIING: skiing,
  SURFING: surfing,
  OUTDOOR_SIGHTSEEING: outdoorSightseeing,
  INDOOR_SIGHTSEEING: indoorSightseeing,
};
