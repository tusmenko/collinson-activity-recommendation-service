import { Injectable } from '@nestjs/common';

import type { Source } from '../../../weather/index.js';
import { ScoreEngine } from '../../engine/score-engine.service.js';
import type { ClassifierInput, ClassifierOutput } from '../../ranking.types.js';
import { Classifier } from '../../registry/classifier.port.js';

// Always applicable: rain, temperature comfort and gusts decide the day.
@Injectable()
export class OutdoorSightseeingClassifier extends Classifier {
  readonly id = 'OUTDOOR_SIGHTSEEING';
  readonly version = '1.0.0';
  readonly requires: readonly Source[] = ['FORECAST'];

  constructor(private readonly engine: ScoreEngine) {
    super();
  }

  score({ days, rules }: ClassifierInput): Promise<ClassifierOutput> {
    return Promise.resolve({ status: 'APPLICABLE', days: this.engine.scoreDays(days, rules) });
  }
}
