import type { DaySignals } from '../../weather/index';

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
