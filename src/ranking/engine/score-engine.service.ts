import { Injectable } from '@nestjs/common';

import type { LocationFacts } from '../../location/index';
import type { DaySignals } from '../../weather/index';
import type { DayScore } from '../ranking.types';
import type { RuleSet } from '../rules/rule-set.schema';
import type { GateResult, PlaceGateResult } from './engine.types';
import { bound, weigh } from './engine.util';

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

  // Below `applicability.minElevation`, or with no known elevation, the place does not suit the activity (A-8).
  placeGate(facts: LocationFacts, rules: RuleSet): PlaceGateResult {
    if (rules.applicability === undefined) {
      return { applicable: true };
    }
    const { minElevation } = rules.applicability;
    if (facts.elevation === undefined) {
      return { applicable: false, reason: 'elevation unknown' };
    }
    return facts.elevation < minElevation
      ? {
          applicable: false,
          reason: `elevation ${String(facts.elevation)} m is below ${String(minElevation)} m`,
        }
      : { applicable: true };
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
