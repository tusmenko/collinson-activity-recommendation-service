import { Module } from '@nestjs/common';

import { AuditModule } from './audit/audit.module';
import { IndoorSightseeingClassifier } from './classifiers/indoor-sightseeing/indoor-sightseeing.classifier';
import { OutdoorSightseeingClassifier } from './classifiers/outdoor-sightseeing/outdoor-sightseeing.classifier';
import { SkiingClassifier } from './classifiers/skiing/skiing.classifier';
import { SurfingClassifier } from './classifiers/surfing/surfing.classifier';
import { RankingService } from './ranking.service';
import { ClassifierRegistry } from './registry/classifier-registry.service';
import { RegistryModule } from './registry/registry.module';
import { RuleSetProvider } from './rules/rule-set.port';
import { StaticRuleSetAdapter } from './rules/static-rule-set.adapter';

// Adding an activity is one folder under classifiers/ (classifier, rules JSON, spec) plus one entry in this list
// (QAS-7); the classifier carries its rule file, and the rule-set version is built from the registered set.
@Module({
  imports: [
    RegistryModule.register([
      SkiingClassifier,
      SurfingClassifier,
      OutdoorSightseeingClassifier,
      IndoorSightseeingClassifier,
    ]),
    AuditModule,
  ],
  providers: [
    RankingService,
    {
      provide: RuleSetProvider,
      inject: [ClassifierRegistry],
      useFactory: (registry: ClassifierRegistry): RuleSetProvider =>
        new StaticRuleSetAdapter(registry.ruleFiles()),
    },
  ],
  exports: [RankingService, RegistryModule],
})
export class RankingModule {}
