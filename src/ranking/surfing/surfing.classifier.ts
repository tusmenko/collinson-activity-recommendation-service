import { Injectable } from '@nestjs/common';

import type { Source } from '../../weather/index.js';
import { Classifier } from '../classifier.port.js';
import type { ClassifierInput, ClassifierOutput } from '../ranking.types.js';
import { ScoreEngine } from '../score-engine.service.js';

// Not applicable where the marine model has no data (A-9); a lagoon with data scores low instead.
@Injectable()
export class SurfingClassifier extends Classifier {
  readonly id = 'SURFING';
  readonly version = '1.0.0';
  readonly requires: readonly Source[] = ['FORECAST', 'MARINE'];

  constructor(private readonly engine: ScoreEngine) {
    super();
  }

  score({ days, rules }: ClassifierInput): Promise<ClassifierOutput> {
    const noMarineData = days.every((day) => day.waveHeight === null && day.wavePeriod === null);
    if (noMarineData) {
      return Promise.resolve({
        status: 'NOT_APPLICABLE',
        reason: 'no marine data at this location',
        days: this.engine.unscored(days),
      });
    }
    return Promise.resolve({ status: 'APPLICABLE', days: this.engine.scoreDays(days, rules) });
  }
}
