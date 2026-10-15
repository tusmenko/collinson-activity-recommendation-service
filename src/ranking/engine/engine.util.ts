import type { DaySignals } from '../../weather/index.js';
import type { Effect, Factor } from '../ranking.types.js';
import type { FactorRule, Range, RuleSet } from '../rules/rule-set.schema.js';
import { FACTOR_SCORE } from './engine.const.js';
import type { WeighedFactor } from './engine.types.js';

function inside(value: number, range: Range): boolean {
  return (
    (range.gt === undefined || value > range.gt) &&
    (range.gte === undefined || value >= range.gte) &&
    (range.lt === undefined || value < range.lt) &&
    (range.lte === undefined || value <= range.lte)
  );
}

function factorScore(value: number, rule: FactorRule): number {
  if (rule.good.some((range) => inside(value, range))) {
    return FACTOR_SCORE.good;
  }
  return rule.poor.some((range) => inside(value, range)) ? FACTOR_SCORE.poor : FACTOR_SCORE.between;
}

function effectOf(score: number | null): Effect {
  if (score === FACTOR_SCORE.good) {
    return 'POSITIVE';
  }
  return score === FACTOR_SCORE.poor ? 'NEGATIVE' : 'NEUTRAL';
}

export function weigh(day: DaySignals, rule: FactorRule): WeighedFactor {
  const value = day[rule.signal];
  const score = value === null ? null : factorScore(value, rule);
  const factor: Factor = {
    signal: rule.signal,
    value,
    unit: rule.unit,
    effect: effectOf(score),
    note: rule.note,
  };
  return { factor, rule, score };
}

// A disqualifying factor (poor and heavy enough) caps the day; the floor then lifts it.
export function bound(mean: number, weighed: readonly WeighedFactor[], rules: RuleSet): number {
  const { poorCap, floor } = rules;
  const disqualified =
    poorCap !== undefined &&
    weighed.some(
      ({ rule, score }) => score === FACTOR_SCORE.poor && rule.weight >= poorCap.minWeight,
    );
  const capped = disqualified ? Math.min(mean, poorCap.max) : mean;
  return floor === undefined ? capped : Math.max(floor, capped);
}
