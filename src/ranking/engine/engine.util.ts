import type { DaySignals } from '../../weather/index';
import type { Effect, Factor } from '../ranking.types';
import type { FactorRule, Range, RuleSet } from '../rules/rule-set.schema';
import { FACTOR_SCORE } from './engine.const';
import type { WeighedFactor } from './engine.types';

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

function anyHeavy(weighed: readonly WeighedFactor[], score: number, minWeight: number): boolean {
  return weighed.some((entry) => entry.score === score && entry.rule.weight >= minWeight);
}

// Order (D-6): the weighted mean; then a disqualifying factor (poor and heavy enough) caps the day; otherwise a
// compelling one (good and heavy enough) lifts it to the boost minimum, so a boost never overrides a cap; the
// floor applies last.
export function bound(mean: number, weighed: readonly WeighedFactor[], rules: RuleSet): number {
  const { poorCap, goodBoost, floor } = rules;
  let day = mean;
  if (poorCap !== undefined && anyHeavy(weighed, FACTOR_SCORE.poor, poorCap.minWeight)) {
    day = Math.min(day, poorCap.max);
  } else if (goodBoost !== undefined && anyHeavy(weighed, FACTOR_SCORE.good, goodBoost.minWeight)) {
    day = Math.max(day, goodBoost.min);
  }
  return floor === undefined ? day : Math.max(floor, day);
}
