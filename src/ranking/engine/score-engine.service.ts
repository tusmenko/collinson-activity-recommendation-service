import { Injectable } from '@nestjs/common';

import type { DaySignals } from '../weather/index.js';
import { FACTOR_SCORE } from './ranking.const.js';
import type { DayScore, Effect, Factor, GateResult } from './ranking.types.js';
import type { FactorRule, Range, RuleSet } from './rule-set.schema.js';

interface WeighedFactor {
  readonly factor: Factor;
  readonly rule: FactorRule;
  readonly score: number | null;
}

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

function weigh(day: DaySignals, rule: FactorRule): WeighedFactor {
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
function bound(mean: number, weighed: readonly WeighedFactor[], rules: RuleSet): number {
  const { poorCap, floor } = rules;
  const disqualified =
    poorCap !== undefined &&
    weighed.some(
      ({ rule, score }) => score === FACTOR_SCORE.poor && rule.weight >= poorCap.minWeight,
    );
  const capped = disqualified ? Math.min(mean, poorCap.max) : mean;
  return floor === undefined ? capped : Math.max(floor, capped);
}

// Pure threshold scoring shared by every rule-based classifier (design D-6, D-6.1).
@Injectable()
export class ScoreEngine {
  scoreDays(days: readonly DaySignals[], rules: RuleSet): DayScore[] {
    return days.map((day) => this.scoreDay(day, rules));
  }

  scoreDay(day: DaySignals, rules: RuleSet): DayScore {
    const weighed = rules.factors.map((rule) => weigh(day, rule));
    let total = 0;
    let weight = 0;
    for (const { rule, score } of weighed) {
      if (score !== null) {
        total += score * rule.weight;
        weight += rule.weight;
      }
    }
    const factors = weighed.map(({ factor }) => factor);
    if (weight === 0) {
      return { date: day.date, score: null, factors };
    }
    return { date: day.date, score: bound(Math.round(total / weight), weighed, rules), factors };
  }

  gate(days: readonly DaySignals[], rules: RuleSet): GateResult {
    if (rules.gate === undefined) {
      return { open: true };
    }
    const { signal, min } = rules.gate;
    const values = days.map((day) => day[signal]).filter((value) => value !== null);
    const max = values.length === 0 ? null : Math.max(...values);
    return max !== null && max >= min ? { open: true } : { open: false, min, max };
  }

  unscored(days: readonly DaySignals[]): DayScore[] {
    return days.map((day) => ({ date: day.date, score: null, factors: [] }));
  }
}
