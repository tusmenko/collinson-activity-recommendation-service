import { Injectable } from '@nestjs/common';

import type { DaySignals } from '../../weather/index.js';
import type { DayScore } from '../ranking.types.js';
import type { RuleSet } from '../rules/rule-set.schema.js';
import type { GateResult } from './engine.types.js';
import { bound, weigh } from './engine.util.js';

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
