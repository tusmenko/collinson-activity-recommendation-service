import { Injectable } from '@nestjs/common';

import type { Source } from '../../../weather/index';
import { ScoreEngine } from '../../engine/score-engine.service';
import type { ClassifierInput, ClassifierOutput } from '../../ranking.types';
import { Classifier } from '../../registry/classifier.port';
import surfingRules from './surfing.rules.json' with { type: 'json' };

// Not applicable where the marine model has no data (A-9); a lagoon with data scores low instead.
@Injectable()
export class SurfingClassifier extends Classifier {
  readonly id = 'SURFING';
  readonly version = '1.0.0';
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
    return Promise.resolve({ status: 'APPLICABLE', days: this.engine.scoreDays(days, rules) });
  }

  private marineReason(days: ClassifierInput['days']): string | null {
    const noMarineData = days.every((day) => day.waveHeight === null && day.wavePeriod === null);
    return noMarineData ? 'no marine data at this location' : null;
  }
}
