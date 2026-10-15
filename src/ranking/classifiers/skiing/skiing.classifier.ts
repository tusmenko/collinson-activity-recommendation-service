import { Injectable } from '@nestjs/common';

import type { Source } from '../../../weather/index';
import { ScoreEngine } from '../../engine/score-engine.service';
import type { ClassifierInput, ClassifierOutput } from '../../ranking.types';
import { Classifier } from '../../registry/classifier.port';
import type { RuleSet } from '../../rules/rule-set.schema';
import skiingRules from './skiing.rules.json' with { type: 'json' };

// Gated on the place's elevation (A-8, owner decision 2026-10-15), then on the window's maximum snow depth (A-50);
// scored by snowpack, fresh snow, temperature, gusts.
@Injectable()
export class SkiingClassifier extends Classifier {
  readonly id = 'SKIING';
  readonly version = '1.1.0';
  readonly requires: readonly Source[] = ['FORECAST'];
  readonly ruleFile: unknown = skiingRules;

  constructor(private readonly engine: ScoreEngine) {
    super();
  }

  // The place decides NOT_APPLICABLE (elevation); the window decides NO_CONDITIONS (no snowpack this week).
  score({ days, facts, rules }: ClassifierInput): Promise<ClassifierOutput> {
    const place = this.engine.placeGate(facts, rules);
    if (!place.applicable) {
      return Promise.resolve({
        status: 'NOT_APPLICABLE',
        reason: place.reason,
        days: this.engine.unscored(days),
      });
    }
    const snow = this.snowReason(days, rules);
    if (snow !== null) {
      return Promise.resolve({
        status: 'NO_CONDITIONS',
        reason: snow,
        days: this.engine.unscored(days),
      });
    }
    return Promise.resolve({ status: 'APPLICABLE', days: this.engine.scoreDays(days, rules) });
  }

  private snowReason(days: ClassifierInput['days'], rules: RuleSet): string | null {
    const gate = this.engine.gate(days, rules);
    if (gate.open) {
      return null;
    }
    return gate.max === null
      ? 'snow depth unavailable on every day'
      : `snow depth below ${String(gate.min)} cm on every day (max ${String(gate.max)} cm)`;
  }
}
