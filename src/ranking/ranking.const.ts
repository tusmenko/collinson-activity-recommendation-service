import type { DaySignals } from '../weather/index.js';

// The built-in activities; the registry stays open to more (QAS-7), so this is not the full set.
export const ACTIVITIES = [
  'SKIING',
  'SURFING',
  'OUTDOOR_SIGHTSEEING',
  'INDOOR_SIGHTSEEING',
] as const;

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

export const PROVIDER = 'open-meteo';

// Prefix of RuleSetProvider.version; bumps when the rule-file schema changes.
export const RULE_SET_SCHEMA_VERSION = 'v1';

export const FACTOR_SCORE = { good: 100, between: 50, poor: 0 } as const;
