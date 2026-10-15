import { Injectable } from '@nestjs/common';

import type { Source } from '../../../weather/index.js';
import { ScoreEngine } from '../../engine/score-engine.service.js';
import type { ClassifierInput, ClassifierOutput } from '../../ranking.types.js';
import { Classifier } from '../../registry/classifier.port.js';

// Always applicable and never poor (A-13): bad weather outside raises it, the rule set's floor holds it up.
@Injectable()
export class IndoorSightseeingClassifier extends Classifier {
  readonly id = 'INDOOR_SIGHTSEEING';
  readonly version = '1.0.0';
  readonly requires: readonly Source[] = ['FORECAST'];

  constructor(private readonly engine: ScoreEngine) {
    super();
  }

  score({ days, rules }: ClassifierInput): Promise<ClassifierOutput> {
    return Promise.resolve({ status: 'APPLICABLE', days: this.engine.scoreDays(days, rules) });
  }
}
