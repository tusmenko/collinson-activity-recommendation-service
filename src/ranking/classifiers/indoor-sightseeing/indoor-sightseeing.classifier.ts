import { Injectable } from '@nestjs/common';

import type { Source } from '../../../weather/index';
import { ScoreEngine } from '../../engine/score-engine.service';
import type { ClassifierInput, ClassifierOutput } from '../../ranking.types';
import { Classifier } from '../../registry/classifier.port';
import indoorSightseeingRules from './indoor-sightseeing.rules.json' with { type: 'json' };

// Always applicable and never poor (A-13): bad weather outside raises it, the rule set's floor holds it up.
@Injectable()
export class IndoorSightseeingClassifier extends Classifier {
  readonly id = 'INDOOR_SIGHTSEEING';
  readonly version = '1.0.0';
  readonly requires: readonly Source[] = ['FORECAST'];
  readonly ruleFile: unknown = indoorSightseeingRules;

  constructor(private readonly engine: ScoreEngine) {
    super();
  }

  score({ days, facts, rules }: ClassifierInput): Promise<ClassifierOutput> {
    const place = this.engine.placeGate(facts, rules);
    if (!place.applicable) {
      return Promise.resolve({
        status: 'NOT_APPLICABLE',
        reason: place.reason,
        days: this.engine.unscored(days),
      });
    }
    return Promise.resolve({ status: 'APPLICABLE', days: this.engine.scoreDays(days, rules) });
  }
}
