import { Injectable } from '@nestjs/common';

import type { Source } from '../../weather/index.js';
import { Classifier } from '../classifier.port.js';
import type { ClassifierInput, ClassifierOutput } from '../ranking.types.js';
import { ScoreEngine } from '../score-engine.service.js';

// Gated on the window's maximum snow depth (A-50); scored by snowpack, fresh snow, temperature, gusts.
@Injectable()
export class SkiingClassifier extends Classifier {
  readonly id = 'SKIING';
  readonly version = '1.0.0';
  readonly requires: readonly Source[] = ['FORECAST'];

  constructor(private readonly engine: ScoreEngine) {
    super();
  }

  score({ days, rules }: ClassifierInput): Promise<ClassifierOutput> {
    const gate = this.engine.gate(days, rules);
    if (!gate.open) {
      const reason =
        gate.max === null
          ? 'snow depth unavailable on every day'
          : `snow depth below ${String(gate.min)} cm on every day (max ${String(gate.max)} cm)`;
      return Promise.resolve({
        status: 'NOT_APPLICABLE',
        reason,
        days: this.engine.unscored(days),
      });
    }
    return Promise.resolve({ status: 'APPLICABLE', days: this.engine.scoreDays(days, rules) });
  }
}
