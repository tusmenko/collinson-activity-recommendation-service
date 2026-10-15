import { Module } from '@nestjs/common';

import { AuditModule } from './audit/audit.module.js';
import { IndoorSightseeingModule } from './classifiers/indoor-sightseeing/indoor-sightseeing.module.js';
import { OutdoorSightseeingModule } from './classifiers/outdoor-sightseeing/outdoor-sightseeing.module.js';
import { SkiingModule } from './classifiers/skiing/skiing.module.js';
import { SurfingModule } from './classifiers/surfing/surfing.module.js';
import { RankingService } from './ranking.service.js';
import { RegistryModule } from './registry/registry.module.js';
import { RulesModule } from './rules/rules.module.js';

// Adding an activity is one folder under classifiers/ (module, classifier, rules) plus one import here and its
// rule file in RULE_FILES (QAS-7). Each classifier module registers itself on init, in this import order.
@Module({
  imports: [
    RegistryModule,
    RulesModule,
    AuditModule,
    SkiingModule,
    SurfingModule,
    OutdoorSightseeingModule,
    IndoorSightseeingModule,
  ],
  providers: [RankingService],
  exports: [RankingService, RegistryModule],
})
export class RankingModule {}
