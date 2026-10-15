import { Injectable } from '@nestjs/common';

import type { Source } from '../../../weather/index';
import { ScoreEngine } from '../../engine/score-engine.service';
import type { ClassifierInput, ClassifierOutput } from '../../ranking.types';
import { Classifier } from '../../registry/classifier.port';
import outdoorSightseeingRules from './outdoor-sightseeing.rules.json' with { type: 'json' };

// Always applicable: rain, temperature comfort and gusts decide the day.
@Injectable()
export class OutdoorSightseeingClassifier extends Classifier {
  readonly id = 'OUTDOOR_SIGHTSEEING';
  readonly version = '1.0.0';
  readonly requires: readonly Source[] = ['FORECAST'];
  readonly ruleFile: unknown = outdoorSightseeingRules;

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
