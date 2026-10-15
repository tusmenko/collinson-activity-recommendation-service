import { Injectable } from '@nestjs/common';

import type { LocationFacts } from '../../location/index.js';
import type { Source } from '../../weather/index.js';
import { Classifier } from '../classifier.port.js';
import type { ClassifierInput, ClassifierOutput } from '../ranking.types.js';
import type { RuleSet } from '../rule-set.schema.js';
import { ScoreEngine } from '../score-engine.service.js';

// Gated on the place's elevation (A-8, owner decision 2026-10-15), then on the window's maximum snow depth (A-50);
// scored by snowpack, fresh snow, temperature, gusts.
@Injectable()
export class SkiingClassifier extends Classifier {
  readonly id = 'SKIING';
  readonly version = '1.1.0';
  readonly requires: readonly Source[] = ['FORECAST'];

  constructor(private readonly engine: ScoreEngine) {
    super();
  }

  score({ days, facts, rules }: ClassifierInput): Promise<ClassifierOutput> {
    const reason = elevationReason(facts, rules) ?? this.snowReason(days, rules);
    if (reason !== null) {
      return Promise.resolve({
        status: 'NOT_APPLICABLE',
        reason,
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

function elevationReason(facts: LocationFacts, rules: RuleSet): string | null {
  if (rules.applicability === undefined) {
    return null;
  }
  const { minElevation } = rules.applicability;
  if (facts.elevation === undefined) {
    return 'elevation unknown';
  }
  return facts.elevation < minElevation
    ? `elevation ${String(facts.elevation)} m is below ${String(minElevation)} m`
    : null;
}
