import { Injectable } from '@nestjs/common';

import type { Source } from '../../../weather/index';
import { ScoreEngine } from '../../engine/score-engine.service';
import type { ClassifierInput, ClassifierOutput } from '../../ranking.types';
import { Classifier } from '../../registry/classifier.port';
import type { RuleSet } from '../../rules/rule-set.schema';
import surfingRules from './surfing.rules.json' with { type: 'json' };

// Not applicable where the marine model has no data (A-9); no conditions when no day's wave period reaches the
// swell gate (6 s), which separates ocean swell from lake, lagoon and Baltic chop (H-3).
@Injectable()
export class SurfingClassifier extends Classifier {
  readonly id = 'SURFING';
  readonly version = '1.1.0';
  readonly requires: readonly Source[] = ['FORECAST', 'MARINE'];
  readonly ruleFile: unknown = surfingRules;

  constructor(private readonly engine: ScoreEngine) {
    super();
  }

  score({ days, facts, rules }: ClassifierInput): Promise<ClassifierOutput> {
    const place = this.engine.placeGate(facts, rules);
    const reason = place.applicable ? this.marineReason(days) : place.reason;
    if (reason !== null) {
      return Promise.resolve({
        status: 'NOT_APPLICABLE',
        reason,
        days: this.engine.unscored(days),
      });
    }
    const swell = this.swellReason(days, rules);
    if (swell !== null) {
      return Promise.resolve({
        status: 'NO_CONDITIONS',
        reason: swell,
        days: this.engine.unscored(days),
      });
    }
    return Promise.resolve({ status: 'APPLICABLE', days: this.engine.scoreDays(days, rules) });
  }

  private swellReason(days: ClassifierInput['days'], rules: RuleSet): string | null {
    const gate = this.engine.gate(days, rules);
    if (gate.open) {
      return null;
    }
    return gate.max === null
      ? 'no swell: wave period unavailable on every day'
      : `no swell: wave period under ${String(gate.min)} s on every day (max ${String(gate.max)} s)`;
  }

  private marineReason(days: ClassifierInput['days']): string | null {
    const noMarineData = days.every((day) => day.waveHeight === null && day.wavePeriod === null);
    return noMarineData ? 'no marine data at this location' : null;
  }
}
