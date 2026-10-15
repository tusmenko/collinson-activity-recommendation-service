import { Module } from '@nestjs/common';

import type { Classifier } from './classifier.port.js';
import { ClassifierRegistry } from './classifier-registry.service.js';
import { IndoorSightseeingClassifier } from './indoor-sightseeing/indoor-sightseeing.classifier.js';
import { OutdoorSightseeingClassifier } from './outdoor-sightseeing/outdoor-sightseeing.classifier.js';
import { RankingAuditService } from './ranking-audit.service.js';
import { RankingService } from './ranking.service.js';
import { RuleSetProvider } from './rule-set.port.js';
import { ScoreEngine } from './score-engine.service.js';
import { SkiingClassifier } from './skiing/skiing.classifier.js';
import { StaticRuleSetAdapter } from './static-rule-set.adapter.js';
import { SurfingClassifier } from './surfing/surfing.classifier.js';

// Adding an activity is one folder (classifier and rules) plus one entry here and one in the rule-set adapter (QAS-7).
const CLASSIFIERS = [
  SkiingClassifier,
  SurfingClassifier,
  OutdoorSightseeingClassifier,
  IndoorSightseeingClassifier,
];

@Module({
  providers: [
    ScoreEngine,
    ...CLASSIFIERS,
    {
      provide: ClassifierRegistry,
      useFactory: (...classifiers: Classifier[]): ClassifierRegistry => {
        const registry = new ClassifierRegistry();
        for (const classifier of classifiers) {
          registry.register(classifier);
        }
        return registry;
      },
      inject: CLASSIFIERS,
    },
    { provide: RuleSetProvider, useFactory: (): RuleSetProvider => new StaticRuleSetAdapter() },
    RankingAuditService,
    RankingService,
  ],
  exports: [RankingService, ClassifierRegistry],
})
export class RankingModule {}
